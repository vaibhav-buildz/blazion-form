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
  let user = users?.users?.find(u => u.email === TEST_EMAIL)
  if (user) {
    await supabaseAdmin.auth.admin.deleteUser(user.id)
  }
  const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (createErr) {
    console.error("Error creating user:", createErr)
  } else {
    console.log("Successfully created test user:", newUser.user.email)
  }
}

async function runTest() {
  console.log("=== STARTING AI FORM GENERATION PLAYWRIGHT TEST ===")
  await ensureTestUser()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  page.on("console", msg => console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`))
  page.on("pageerror", err => console.error(`[PAGE ERROR]`, err))

  try {
    console.log("[1] Navigating to login page...")
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
    
    console.log("[2] Filling login credentials...")
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    
    console.log("[3] Waiting for dashboard navigation...")
    try {
      await page.waitForURL("**/dashboard", { timeout: 10000 })
      console.log("Successfully reached Dashboard!")
    } catch (e) {
      console.log("Current URL:", page.url())
      const errorText = await page.textContent('.bg-destructive\\/10').catch(() => null)
      if (errorText) console.log("Login page error display:", errorText)
      throw e
    }

    console.log("[4] Clicking 'Generate with AI' button...")
    const aiButton = page.locator('button:has-text("Generate with AI")').first()
    await aiButton.waitFor({ state: "visible", timeout: 10000 })
    await aiButton.click()

    console.log("[5] Waiting for AI modal dialog...")
    await page.waitForSelector('textarea#form-description', { timeout: 5000 })

    const promptText = "A customer feedback survey for a coffee shop collecting customer name, rating, favorite beverage, and suggestions."
    console.log(`[6] Typing prompt: "${promptText}"`)
    await page.fill('textarea#form-description', promptText)

    console.log("[7] Submitting form generation request...")
    const generateSubmitBtn = page.locator('button[type="submit"]:has-text("Generate")')
    await generateSubmitBtn.click()

    console.log("[8] Waiting for AI generation API and redirection to form editor...")
    await page.waitForURL(/\/dashboard\/forms\/[^\/]+\/edit/, { timeout: 30000 })
    
    const currentUrl = page.url()
    console.log(`Successfully navigated to form editor: ${currentUrl}`)

    console.log("[9] Verifying generated questions and elements in the builder...")
    await page.waitForTimeout(3000)
    
    const questionCards = page.locator('.relative.mb-3.rounded-lg, .border.rounded-lg')
    const count = await questionCards.count()
    console.log(`Number of generated question cards found: ${count}`)

    // Print titles of questions found
    for (let i = 0; i < count; i++) {
      const text = await questionCards.nth(i).innerText().catch(() => "")
      console.log(` Question ${i + 1}: ${text.split('\n')[0]}`)
    }

    if (count > 0) {
      console.log("\n=======================================================")
      console.log("SUCCESS! AI Form Generation verified successfully with Gemini 2.5 Flash!")
      console.log("=======================================================\n")
    } else {
      throw new Error("No question cards were rendered in the form editor!")
    }
  } catch (err) {
    console.error("TEST FAILED:", err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runTest()
