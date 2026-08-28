import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

export function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID

  return new Anthropic({
    apiKey,
    ...(workspaceId
      ? {
          defaultHeaders: {
            "anthropic-workspace-id": workspaceId,
          },
        }
      : {}),
  })
}

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

export async function generateFormFromPrompt(
  description: string
): Promise<GeneratedFormData> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key is not configured.")
  }

  if (!description || !description.trim()) {
    throw new Error("Description is required.")
  }

  const anthropic = getAnthropicClient()
  const modelName =
    process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-20250219"

  let responseText = ""
  try {
    const response = await anthropic.messages.create({
      model: modelName,
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
    // If it was a model not found error, try fallback to claude-3-5-sonnet-20241022
    if (
      apiError?.status === 404 ||
      apiError?.message?.includes("model") ||
      apiError?.message?.includes("not_found")
    ) {
      try {
        console.log("Retrying with fallback model claude-3-5-sonnet-20241022...")
        const fallbackResponse = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
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
        const fallbackTextBlock = fallbackResponse.content.find(
          (block) => block.type === "text"
        )
        if (fallbackTextBlock && fallbackTextBlock.type === "text") {
          responseText = fallbackTextBlock.text
        }
      } catch (fallbackError: any) {
        console.error("Anthropic fallback API error:", fallbackError)
        throw new Error(
          fallbackError?.message || "Failed to communicate with Claude API."
        )
      }
    } else {
      throw new Error(
        apiError?.message || "Failed to communicate with Claude API."
      )
    }
  }

  // Strip markdown code fences or any outer text if present
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
