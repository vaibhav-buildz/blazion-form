import { NextResponse } from "next/server"
import { suggestNextFieldsWithAI } from "@/lib/ai"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { formTitle, currentQuestionTitles } = body

    const suggestions = await suggestNextFieldsWithAI(
      formTitle || "Form",
      Array.isArray(currentQuestionTitles) ? currentQuestionTitles : []
    )

    return NextResponse.json({ suggestions })
  } catch (error: any) {
    console.error("AI Suggest Fields error:", error)
    return NextResponse.json({ suggestions: [] })
  }
}
