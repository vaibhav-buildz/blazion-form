const fs = require("fs")
const { createClient } = require("@supabase/supabase-js")

// Load .env.local
const envText = fs.readFileSync(".env.local", "utf-8")
const env = {}
envText.split("\n").forEach((line) => {
  const parts = line.split("=")
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join("=").trim()
  }
})

const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

const BASE_URL = "http://localhost:3000"

async function runFeatureTests() {
  console.log("=== VERIFYING NEW EXTENDED FEATURES ===")
  const results = []

  try {
    // 1. Check Respondent Portal API
    console.log("\n[TEST 1] Testing Respondent Portal Submissions API...")
    const portalRes = await fetch(`${BASE_URL}/api/portal/submissions?email=test@example.com`)
    const portalJson = await portalRes.json()
    const portalOk = portalRes.status === 200 && Array.isArray(portalJson.submissions)
    console.log("[TEST 1 Result]:", { status: portalRes.status, count: portalJson.submissions?.length })
    results.push({ name: "Respondent Portal API", passed: portalOk })

    // 2. Check Form Templates API (requires user auth or test payload)
    console.log("\n[TEST 2] Testing Template Creation API...")
    // Get test user id
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const testUser = users?.users?.find(u => u.email === "e2e-test@example.com") || users?.users?.[0]
    
    if (testUser) {
      // Create a test form directly to test Developer API
      const { data: form, error: fErr } = await supabaseAdmin
        .from("forms")
        .insert({
          user_id: testUser.id,
          title: "Developer API Test Form",
          slug: `dev-api-test-${Date.now()}`,
          status: "published",
          settings: {
            developer_api_key: "blz_dev_test_secret_12345"
          }
        })
        .select()
        .single()

      if (form) {
        console.log(`[TEST 2] Created test form: ${form.id}`)

        // 3. Test Developer API submission (POST /api/v1/forms/[id]/submissions)
        console.log("\n[TEST 3] Testing Developer API v1 POST submission...")
        const devSubmitRes = await fetch(`${BASE_URL}/api/v1/forms/${form.id}/submissions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer blz_dev_test_secret_12345"
          },
          body: JSON.stringify({
            respondent_email: "api-respondent@blazion.com",
            answers: {
              name: "API Tester",
              feedback: "Excellent programmatic form submission test!"
            }
          })
        })
        const devSubmitJson = await devSubmitRes.json()
        console.log("[TEST 3 Result]:", { status: devSubmitRes.status, success: devSubmitJson.success, responseId: devSubmitJson.response_id })
        results.push({ name: "Developer API v1 POST", passed: devSubmitRes.status === 200 && devSubmitJson.success })

        // 4. Test Developer API query (GET /api/v1/forms/[id]/submissions)
        console.log("\n[TEST 4] Testing Developer API v1 GET query...")
        const devQueryRes = await fetch(`${BASE_URL}/api/v1/forms/${form.id}/submissions`, {
          headers: {
            "Authorization": "Bearer blz_dev_test_secret_12345"
          }
        })
        const devQueryJson = await devQueryRes.json()
        console.log("[TEST 4 Result]:", { status: devQueryRes.status, total: devQueryJson.total })
        results.push({ name: "Developer API v1 GET", passed: devQueryRes.status === 200 && devQueryJson.total >= 1 })

        // 5. Test Respondent Portal lookup for the new submission
        console.log("\n[TEST 5] Verifying Respondent Portal reflects the new submission...")
        const portalLookupRes = await fetch(`${BASE_URL}/api/portal/submissions?email=api-respondent@blazion.com`)
        const portalLookupJson = await portalLookupRes.json()
        const found = portalLookupJson.submissions?.some(s => s.formId === form.id)
        console.log("[TEST 5 Result]: Found submission in portal =", found)
        results.push({ name: "Respondent Portal Lookup", passed: Boolean(found) })

        // 6. Test Developer API v1 forms list
        console.log("\n[TEST 6] Testing Developer API v1 GET /api/v1/forms...")
        const listFormsRes = await fetch(`${BASE_URL}/api/v1/forms`, {
          headers: { "x-api-key": "blz_dev_test_secret_12345" }
        })
        const listFormsJson = await listFormsRes.json()
        console.log("[TEST 6 Result]:", { status: listFormsRes.status, total: listFormsJson.total })
        results.push({ name: "Developer API v1 Forms List", passed: listFormsRes.status === 200 && listFormsJson.total >= 1 })

        // 7. Test Developer API v1 form creation
        console.log("\n[TEST 7] Testing Developer API v1 POST /api/v1/forms...")
        const createFormRes = await fetch(`${BASE_URL}/api/v1/forms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "blz_dev_test_secret_12345"
          },
          body: JSON.stringify({
            title: "Automated Suite Created Form",
            description: "Built through programmatic developer API",
            questions: [
              { title: "Candidate Name", type: "short_text", required: true },
              { title: "WhatsApp Number", type: "phone", required: true }
            ]
          })
        })
        const createFormJson = await createFormRes.json()
        console.log("[TEST 7 Result]:", { status: createFormRes.status, success: createFormJson.success, formId: createFormJson.form?.id })
        results.push({ name: "Developer API v1 Form Create", passed: createFormRes.status === 200 && createFormJson.success })

        if (createFormJson.form?.id) {
          await supabaseAdmin.from("questions").delete().eq("form_id", createFormJson.form.id)
          await supabaseAdmin.from("forms").delete().eq("id", createFormJson.form.id)
        }

        // 8. Test AI Form Auditor API
        console.log("\n[TEST 8] Testing AI Form Auditor API (POST /api/ai/audit)...")
        const auditRes = await fetch(`${BASE_URL}/api/ai/audit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formTitle: "College Hackathon Registration",
            formDescription: "Register student developer teams",
            questions: [
              { id: "q1", title: "Name", type: "short_text", required: true },
              { id: "q2", title: "Phone", type: "phone", required: true }
            ]
          })
        })
        const auditJson = await auditRes.json()
        console.log("[TEST 8 Result]:", { status: auditRes.status, hasFeedback: Boolean(auditJson.overallHealth || auditJson.feedback) })
        results.push({ name: "AI Form Auditor API", passed: auditRes.status === 200 && Boolean(auditJson.overallHealth || auditJson.feedback) })

        // 9. Test AI Field Suggestions API
        console.log("\n[TEST 9] Testing AI Smart Field Suggestions API (POST /api/ai/suggest-fields)...")
        const suggestRes = await fetch(`${BASE_URL}/api/ai/suggest-fields`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formTitle: "Clinic Appointment Booking",
            currentQuestionTitles: ["Patient Name", "Symptoms"]
          })
        })
        const suggestJson = await suggestRes.json()
        console.log("[TEST 9 Result]:", { status: suggestRes.status, count: suggestJson.suggestions?.length })
        results.push({ name: "AI Smart Field Suggestions API", passed: suggestRes.status === 200 && Array.isArray(suggestJson.suggestions) })

        // Cleanup test form & response
        await supabaseAdmin.from("responses").delete().eq("form_id", form.id)
        await supabaseAdmin.from("forms").delete().eq("id", form.id)
        console.log("[CLEANUP] Deleted test form and responses.")
      }
    }

    console.log("\n=== SUMMARY OF NEW EXTENDED FEATURES TESTS ===")
    console.table(results)

  } catch (err) {
    console.error("Test execution error:", err)
  }
}

runFeatureTests()
