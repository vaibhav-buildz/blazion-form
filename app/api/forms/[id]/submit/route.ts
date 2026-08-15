import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  try {
    console.log("API /api/forms/[id]/submit ROUTE REACHED for param id/slug:", id)

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let formQuery = supabase
      .from("forms")
      .select("id, status")
      .eq("status", "published")

    if (isUuid) {
      formQuery = formQuery.or(`id.eq.${id},slug.eq.${id}`)
    } else {
      formQuery = formQuery.eq("slug", id)
    }

    const { data: form, error: formError } = await formQuery.maybeSingle()

    if (formError || !form) {
      console.error("Form error or not found in submit route:", formError)
      return NextResponse.json(
        { error: "Form not found or not published" },
        { status: 404 }
      )
    }


    const body = await req.json()
    console.log("INCOMING SUBMIT BODY:", JSON.stringify(body, null, 2))
    const { answers } = body

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Invalid response data" },
        { status: 400 }
      )
    }

    // Insert response into responses table
    const { data: response, error: insertError } = await supabase
      .from("responses")
      .insert([
        {
          form_id: form.id,
          answers,
        },
      ])
      .select()
      .maybeSingle()

    if (insertError) {
      console.error("Supabase insert error saving response:", insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    console.log("SUCCESSFULLY INSERTED RESPONSE:", response)

    // Insert corresponding rows into file_uploads table for file_upload questions
    if (response?.id) {
      try {
        const { data: questions } = await supabase
          .from("questions")
          .select("id, type")
          .eq("form_id", form.id)

        const fileUploadQuestions = (questions || []).filter(
          (q: any) => q.type === "file_upload"
        )

        for (const q of fileUploadQuestions) {
          const storagePath = answers[q.id]
          if (typeof storagePath === "string" && storagePath.trim()) {
            const pathParts = storagePath.split("/")
            const fileNameRaw = pathParts.pop() || ""
            const fileName = fileNameRaw.replace(/^\d+-/, "") || fileNameRaw
            let fileSize = 0

            try {
              const folder = pathParts.join("/")
              const { data: files } = await supabase.storage
                .from("response-files")
                .list(folder, { search: fileNameRaw })

              const matchingFile = files?.find((f) => f.name === fileNameRaw)
              if (matchingFile?.metadata?.size) {
                fileSize = matchingFile.metadata.size
              }
            } catch (err) {
              console.error("Error fetching file size from storage:", err)
            }

            const { error: fileInsertError } = await supabase
              .from("file_uploads")
              .insert([
                {
                  response_id: response.id,
                  question_id: q.id,
                  storage_path: storagePath,
                  file_name: fileName,
                  file_size: fileSize,
                },
              ])

            if (fileInsertError) {
              console.error("Supabase insert error for file_uploads:", fileInsertError)
            }
          }
        }
      } catch (err) {
        console.error("Error processing file_uploads on submit:", err)
      }
    }

    return NextResponse.json({ success: true, responseId: response?.id })

  } catch (error: any) {
    console.error("Server error submitting form:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
