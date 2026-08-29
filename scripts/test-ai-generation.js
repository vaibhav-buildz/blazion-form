const { chromium } = require("playwright")
const { createClient } = require("@supabase/supabase-js")
const fs = require("fs")

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
const TEST_EMAIL = "ai-test-user@example.com"
const TEST_PASSWORD = "Password123!"

async function ensureTestUser() {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers()
  let user = users?.users?.find((u) => u.email === TEST_EMAIL)
  if (!user) {
    const { data: newUser, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
      })
    if (createErr) console.error("Error creating user:", createErr)
  }
}

async function runTests() {
  console.log("=== STARTING AI QUOTA & GENERATION PLAYWRIGHT TESTS ===")
  await ensureTestUser()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  page.on("console", (msg) =>
    console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`)
  )

  try {
    console.log("[1] Navigating to login page...")
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })

    console.log("[2] Logging in...")
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')

    console.log("[3] Waiting for dashboard navigation...")
    await page.waitForURL("**/dashboard", { timeout: 15000 })
    console.log("Successfully on Dashboard!")

    // -----------------------------------------------------------------
    // TEST A: QUOTA EXCEEDED (429 SIMULATION)
    // -----------------------------------------------------------------
    console.log("\n--- TEST A: QUOTA EXCEEDED (429 WARNING DISPLAY) ---")

    // Route interception for /api/ai/generate-form to return HTTP 429
    await page.route("**/api/ai/generate-form", (route) => {
      console.log("[PLAYWRIGHT MOCK] Intercepting request -> Mocking HTTP 429 Quota Exceeded")
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "AI generation limit reached for today. Please try again later or contact support.",
        }),
      })
    })

    const aiButton = page.locator('button:has-text("Generate with AI")').first()
    await aiButton.waitFor({ state: "visible", timeout: 10000 })
    await aiButton.click()

    await page.waitForSelector("textarea#form-description", { timeout: 5000 })
    await page.fill(
      "textarea#form-description",
      "A survey for customer satisfaction"
    )

    const generateSubmitBtn = page
      .locator('button[type="submit"]:has-text("Generate")')
    await generateSubmitBtn.click()

    console.log("Waiting for quota error alert in modal...")
    await page.waitForTimeout(1000)

    const alertBox = page.locator('.text-destructive')
    await alertBox.waitFor({ state: "visible", timeout: 5000 })
    const alertText = await alertBox.innerText()
    console.log("Alert box text displayed:", alertText)

    if (
      alertText.includes("AI generation limit reached for today") ||
      alertText.includes("limit reached")
    ) {
      console.log("TEST A PASSED: Quota error message rendered correctly!")
    } else {
      throw new Error(`TEST A FAILED: Unexpected error message displayed: ${alertText}`)
    }

    // Close modal
    const cancelBtn = page.locator('button:has-text("Cancel")')
    await cancelBtn.click()
    await page.waitForTimeout(500)

    // Unroute mock
    await page.unroute("**/api/ai/generate-form")

    // -----------------------------------------------------------------
    // TEST B: NORMAL GENERATION WITH GEMINI 2.5 FLASH
    // -----------------------------------------------------------------
    console.log("\n--- TEST B: NORMAL GENERATION WITH GEMINI 2.5 FLASH ---")

    await aiButton.click()
    await page.waitForSelector("textarea#form-description", { timeout: 5000 })
    const normalPrompt = "A feedback form for an event collecting guest name, rating, and comments."
    await page.fill("textarea#form-description", normalPrompt)

    console.log("Submitting normal AI generation request...")
    await generateSubmitBtn.click()

    console.log("Waiting for AI generation API and redirection to form editor...")
    await page.waitForURL(/\/dashboard\/forms\/[^\/]+\/edit/, { timeout: 30000 })

    const currentUrl = page.url()
    console.log(`Successfully navigated to form editor: ${currentUrl}`)

    await page.waitForTimeout(3000)
    const questionCards = page.locator(".relative.mb-3.rounded-lg, .border.rounded-lg")
    const count = await questionCards.count()
    console.log(`Number of generated question cards found: ${count}`)

    if (count > 0) {
      console.log("TEST B PASSED: Normal generation rendered valid form questions!")
    } else {
      throw new Error("TEST B FAILED: No questions rendered!")
    }

    console.log("\n=======================================================")
    console.log("ALL PLAYWRIGHT TESTS PASSED SUCCESSFULLY!")
    console.log("=======================================================\n")
  } catch (err) {
    console.error("TEST FAILED:", err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runTests()
