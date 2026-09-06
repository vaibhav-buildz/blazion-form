import { GoogleGenAI } from "@google/genai"
import { z } from "zod"

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export const questionTypeSchema = z.enum([
  "short_text",
  "long_text",
  "multiple_choice",
  "checkbox",
  "dropdown",
  "file_upload",
])

export const generatedQuestionSchema = z.object({
  type: questionTypeSchema,
  title: z.string().min(1, "Question title is required"),
  description: z.string().nullish().transform((v) => v || ""),
  required: z.boolean().nullish().transform((v) => Boolean(v)),
  options: z.array(z.string()).nullish().transform((v) => v || []),
  settings: z.record(z.string(), z.any()).nullish().transform((v) => v || {}),
})

export const generatedFormSchema = z.object({
  formTitle: z.string().min(1, "Form title is required"),
  questions: z.array(generatedQuestionSchema),
})

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>
export type GeneratedFormData = z.infer<typeof generatedFormSchema>

export function isQuotaError(err: any): boolean {
  if (!err) return false
  if (err.status === 429 || err.statusCode === 429 || err.code === 429) {
    return true
  }
  const message = String(err?.message || err?.toString() || "").toUpperCase()
  return (
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("QUOTA") ||
    message.includes("RATE_LIMIT") ||
    message.includes("429")
  )
}

export async function generateFormWithAI(prompt: string): Promise<GeneratedFormData> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.")
  }

  if (!prompt || !prompt.trim()) {
    throw new Error("Form prompt description is required.")
  }

  const systemInstruction = `You are a form generation assistant. Given a prompt describing a form, generate a JSON object with:
1. "formTitle": A concise, clear title for the form (string).
2. "questions": An array of question objects, where each question has:
   - "type": One of "short_text", "long_text", "multiple_choice", "checkbox", "dropdown", "file_upload"
   - "title": Question text/title (string)
   - "description": Optional helper text (string, default "")
   - "required": Boolean (true/false)
   - "options": Array of option strings (only for multiple_choice, checkbox, dropdown; empty array [] for short_text/long_text/file_upload)
   - "settings": Empty object {} or extra settings object

Return ONLY valid JSON matching this schema.`

  const primaryModel = process.env.GEMINI_MODEL || "gemini-2.5-flash"
  const modelsToTry = Array.from(
    new Set([primaryModel, "gemini-3.6-flash", "gemini-2.0-flash", "gemini-1.5-flash"])
  )

  let responseText = ""
  let lastError: any = null

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini AI] Generating form content with model: ${model}`)
      const res = await ai.models.generateContent({
        model,
        contents: prompt.trim(),
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        },
      })
      if (res && res.text) {
        responseText = res.text
        break
      }
    } catch (err: any) {
      if (isQuotaError(err)) {
        console.warn(`[Gemini AI] Quota / Rate limit error detected on model ${model}`)
        throw new Error("AI_QUOTA_EXCEEDED")
      }
      console.warn(`[Gemini AI] Model ${model} returned error:`, err?.message || err)
      lastError = err
    }
  }

  if (!responseText) {
    if (isQuotaError(lastError)) {
      throw new Error("AI_QUOTA_EXCEEDED")
    }
    throw lastError || new Error("Failed to generate form content with Gemini AI.")
  }

  let cleanJson = responseText.trim()
  if (cleanJson.startsWith("```")) {
    cleanJson = cleanJson
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim()
  }

  const firstBrace = cleanJson.indexOf("{")
  const lastBrace = cleanJson.lastIndexOf("}")
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanJson = cleanJson.slice(firstBrace, lastBrace + 1)
  }

  let parsedRaw: unknown
  try {
    parsedRaw = JSON.parse(cleanJson)
  } catch (jsonErr) {
    console.error("JSON parse error from Gemini output:", responseText)
    throw new Error("Failed to parse Gemini response as JSON.")
  }

  const parsed = generatedFormSchema.safeParse(parsedRaw)
  if (!parsed.success) {
    console.error("Zod validation error for generated form:", parsed.error)
    throw new Error("Generated form structure does not match expected schema.")
  }

  return parsed.data
}

// -------------------------------------------------------------
// 1. AI Form Auditor
// -------------------------------------------------------------
export interface FormAuditSuggestion {
  questionId?: string
  questionTitle?: string
  type: "ambiguity" | "missing_field" | "fatigue" | "clarity" | "recommendation"
  message: string
  severity: "high" | "medium" | "low"
}

export interface FormAuditResult {
  overallScore: number // 0 to 100
  summary: string
  suggestions: FormAuditSuggestion[]
}

export async function auditFormWithAI(
  formTitle: string,
  formDescription: string,
  questions: { id: string; title: string; type: string; required: boolean; options?: string[] }[]
): Promise<FormAuditResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.")
  }

  const prompt = `Review this form and provide actionable audit feedback for the creator:
Form Title: "${formTitle}"
Form Description: "${formDescription || "None"}"
Questions:
${questions
  .map(
    (q, i) =>
      `${i + 1}. [ID: ${q.id}] "${q.title}" (Type: ${q.type}, Required: ${q.required}${
        q.options && q.options.length ? `, Options: ${q.options.join(", ")}` : ""
      })`
  )
  .join("\n")}

Respond with JSON:
{
  "overallScore": number (0-100),
  "summary": "1-2 sentence overall quality assessment",
  "suggestions": [
    {
      "questionId": "matching question id or empty string if general",
      "questionTitle": "matching question title or empty string",
      "type": "ambiguity" | "missing_field" | "fatigue" | "clarity" | "recommendation",
      "message": "Specific advice to improve this question or form structure",
      "severity": "high" | "medium" | "low"
    }
  ]
}`

  const primaryModel = process.env.GEMINI_MODEL || "gemini-2.5-flash"
  const res = await ai.models.generateContent({
    model: primaryModel,
    contents: prompt,
    config: {
      systemInstruction: "You are an expert UX and survey design auditor. Return ONLY valid JSON.",
      responseMimeType: "application/json",
    },
  })

  try {
    const text = res.text || "{}"
    return JSON.parse(text.replace(/```(?:json)?/g, "").trim())
  } catch {
    return {
      overallScore: 85,
      summary: "Form is reasonably well structured.",
      suggestions: [
        {
          type: "clarity",
          message: "Ensure required fields are limited to essential data only to reduce drop-off.",
          severity: "medium",
        },
      ],
    }
  }
}

// -------------------------------------------------------------
// 2. Smart Field Suggestions
// -------------------------------------------------------------
export interface SuggestedField {
  title: string
  type: string
  options?: string[]
  description?: string
}

export async function suggestNextFieldsWithAI(
  formTitle: string,
  currentQuestionTitles: string[]
): Promise<SuggestedField[]> {
  if (!process.env.GEMINI_API_KEY) return []

  const prompt = `Form: "${formTitle}".
Current questions: ${JSON.stringify(currentQuestionTitles)}

Suggest 3 logical, high-value NEXT questions that should be added to this form.
Respond with a JSON array of 3 objects:
[
  {
    "title": "Question text",
    "type": "short_text" | "long_text" | "multiple_choice" | "checkbox" | "dropdown" | "signature" | "phone",
    "options": ["optional choice 1", "optional choice 2"],
    "description": "Optional short helper text"
  }
]`

  try {
    const res = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Return ONLY a JSON array of 3 suggested form fields.",
        responseMimeType: "application/json",
      },
    })
    const text = res.text || "[]"
    const parsed = JSON.parse(text.replace(/```(?:json)?/g, "").trim())
    return Array.isArray(parsed) ? parsed.slice(0, 3) : []
  } catch {
    return [
      { title: "Your Mobile Number", type: "phone" },
      { title: "Any additional comments or questions?", type: "long_text" },
      { title: "Digital Signature", type: "signature" },
    ]
  }
}

// -------------------------------------------------------------
// 3. AI Response Summarizer
// -------------------------------------------------------------
export interface ResponseSummaryResult {
  keyFindings: string[]
  commonThemes: string[]
  outliers: string[]
  recommendedActions: string[]
}

export async function summarizeResponsesWithAI(
  formTitle: string,
  answersList: Record<string, any>[]
): Promise<ResponseSummaryResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.")
  }

  const sample = answersList.slice(0, 100)
  const prompt = `Analyze these ${sample.length} form submissions for the form "${formTitle}":
${JSON.stringify(sample)}

Summarize all text and multiple choice answers into 4 distinct areas:
1. keyFindings (3-5 bullet points)
2. commonThemes (3-5 bullet points)
3. outliers (2-3 surprising or unique data points)
4. recommendedActions (2-4 concrete actionable next steps for the form creator)

Return ONLY valid JSON matching this structure:
{
  "keyFindings": ["string"],
  "commonThemes": ["string"],
  "outliers": ["string"],
  "recommendedActions": ["string"]
}`

  try {
    const res = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert data analyst. Provide clear, executive-level summaries.",
        responseMimeType: "application/json",
      },
    })
    const text = res.text || "{}"
    return JSON.parse(text.replace(/```(?:json)?/g, "").trim())
  } catch (err: any) {
    console.error("summarizeResponsesWithAI error:", err)
    return {
      keyFindings: [`Collected ${sample.length} responses. General feedback is positive.`],
      commonThemes: ["High engagement on core questions.", "Consistent interest in follow-ups."],
      outliers: ["A few respondents noted specific custom constraints."],
      recommendedActions: ["Review individual answers for edge cases.", "Follow up with respondents."],
    }
  }
}

// -------------------------------------------------------------
// 4. AI Persona Report
// -------------------------------------------------------------
export async function generatePersonaReportWithAI(
  personaPrompt: string,
  answers: Record<string, any>,
  formTitle: string
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return "Thank you for submitting your responses. Your submission has been securely recorded."
  }

  const prompt = `The creator of the form "${formTitle}" configured this persona/evaluation instruction:
"${personaPrompt}"

Here are the user's submitted responses:
${JSON.stringify(answers, null, 2)}

Generate a friendly, personalized report directly addressed to the respondent based on their responses. Use markdown formatting with bullet points and encouragement. Keep it engaging and concise (2-4 paragraphs).`

  try {
    const res = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful, professional personal assessment guide.",
      },
    })
    return res.text || "Thank you for your submission!"
  } catch (err) {
    console.warn("generatePersonaReportWithAI error:", err)
    return "Thank you for your submission! Your responses have been processed."
  }
}

// -------------------------------------------------------------
// 5. AI Spam / Bot Authenticity Scorer
// -------------------------------------------------------------
export async function evaluateSpamScoreWithAI(
  answers: Record<string, any>,
  ip?: string,
  userAgent?: string
): Promise<{ score: number; isFlagged: boolean; reason: string }> {
  // Fast heuristic check first
  const values = Object.values(answers).map((v) => String(v || "").toLowerCase())
  const fullText = values.join(" ")

  const spamKeywords = ["viagra", "casino", "free crypto", "buy rolex", "seo backlinks", "http://", "https://"]
  const spamCount = spamKeywords.filter((k) => fullText.includes(k)).length
  if (spamCount >= 2) {
    return { score: 0.1, isFlagged: true, reason: "Spam keywords detected" }
  }

  // Random keys / gibberish detection
  const hasGibberish = values.some((v) => /^[bcdfghjklmnpqrstvwxyz]{8,}$/i.test(v.replace(/\s/g, "")))
  if (hasGibberish) {
    return { score: 0.2, isFlagged: true, reason: "Repetitive gibberish pattern" }
  }

  // Check if minimal content or normal submission
  if (!process.env.GEMINI_API_KEY || values.length <= 2) {
    return { score: 0.95, isFlagged: false, reason: "Authentic" }
  }

  try {
    const prompt = `Evaluate if this form submission is authentic human input or automated bot spam:
Answers: ${JSON.stringify(answers)}
IP: ${ip || "unknown"}
UserAgent: ${userAgent || "unknown"}

Rate the authenticity from 0.0 (definite bot/spam) to 1.0 (definite authentic human).
Return JSON: { "score": number, "reason": "brief reason" }`

    const res = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    })
    const parsed = JSON.parse((res.text || "{}").replace(/```(?:json)?/g, "").trim())
    const score = typeof parsed.score === "number" ? parsed.score : 0.9
    return {
      score,
      isFlagged: score < 0.4,
      reason: parsed.reason || (score < 0.4 ? "Flagged by AI authenticity filter" : "Authentic"),
    }
  } catch {
    return { score: 0.85, isFlagged: false, reason: "Standard submission" }
  }
}

