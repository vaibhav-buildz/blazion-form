import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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
  description: z.string().optional().default(""),
  required: z.boolean().optional().default(false),
  options: z.array(z.string()).optional().default([]),
  settings: z.record(z.string(), z.any()).optional().default({}),
})

export const generatedFormSchema = z.object({
  formTitle: z.string().min(1, "Form title is required"),
  questions: z.array(generatedQuestionSchema),
})

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>
export type GeneratedFormData = z.infer<typeof generatedFormSchema>

export async function generateFormFromPrompt(
  description: string
): Promise<GeneratedFormData> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key is not configured.")
  }

  if (!description || !description.trim()) {
    throw new Error("Description is required.")
  }

  let responseText = ""
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system:
        'You are a form-building assistant. Given a description, generate a JSON array of form questions. Each question must have: type (one of: short_text, long_text, multiple_choice, checkbox, dropdown, file_upload), title (string), description (string, optional, can be empty), required (boolean), options (array of strings, only for multiple_choice/checkbox/dropdown, otherwise empty array), settings (object, can be empty {}). Also generate a suggested form \'title\' for the overall form. Return ONLY valid JSON in this exact shape: { "formTitle": string, "questions": [...] }. No markdown, no code fences, no explanation — just the raw JSON object.',
      messages: [
        {
          role: "user",
          content: description.trim(),
        },
      ],
    })

    const textBlock = response.content.find((block) => block.type === "text")
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response received from Claude API.")
    }
    responseText = textBlock.text
  } catch (apiError: any) {
    console.error("Anthropic API error:", apiError)
    throw new Error(apiError?.message || "Failed to communicate with Claude API.")
  }

  // Strip markdown code fences if present as a safety net
  let cleanJson = responseText.trim()
  if (cleanJson.startsWith("```")) {
    cleanJson = cleanJson
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim()
  }

  let parsedRaw: unknown
  try {
    parsedRaw = JSON.parse(cleanJson)
  } catch (jsonErr) {
    console.error("JSON parse error from Claude output:", responseText)
    throw new Error("Failed to parse AI response as JSON.")
  }

  const parsed = generatedFormSchema.safeParse(parsedRaw)
  if (!parsed.success) {
    console.error("Zod validation error for generated form:", parsed.error)
    throw new Error("Generated form structure does not match expected schema.")
  }

  return parsed.data
}
