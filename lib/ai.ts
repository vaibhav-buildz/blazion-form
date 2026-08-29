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
