import { NextResponse } from "next/server"
import { auditFormWithAI } from "@/lib/ai"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { formTitle, formDescription, questions } = body

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Questions array is required." },
        { status: 400 }
      )
    }

    const audit = await auditFormWithAI(
      formTitle || "Untitled Form",
      formDescription || "",
      questions
    )

    return NextResponse.json(audit)
  } catch (error: any) {
    console.error("AI Audit error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to audit form" },
      { status: 500 }
    )
  }
}
