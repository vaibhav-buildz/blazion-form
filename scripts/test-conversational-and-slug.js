const { chromium } = require("playwright")
const { createClient } = require("@supabase/supabase-js")
const fs = require("fs")
const path = require("path")

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
const TEST_EMAIL = "e2e-test@example.com"
const TEST_PASSWORD = "Password123!"
const SCREENSHOT_DIR = path.join(__dirname, "../e2e-screenshots")

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function runTests() {
  console.log("=== VERIFYING CONVERSATIONAL PASSWORD STEP & SLUG REGENERATION ===")
  const browser = await chromium.launch({ channel: "msedge", headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const results = {
    slugRegeneration: false,
    conversationalPasswordStep: false,
    conversationalNavigationAndSubmit: false,
    details: [],
  }

  try {
    // 1. Log in to dashboard
    console.log("\n[1] Logging into dashboard...")
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL("**/dashboard", { timeout: 10000 })
    console.log("Logged in successfully.")

    // 2. Open or Create a Form for Testing
    console.log("\n[2] Accessing test form in FormBuilder...")
    let editLink = page.locator('a[href*="/edit"]').first()
    if ((await editLink.count()) === 0) {
      await page.click('button:has-text("Create Form")')
      await page.waitForURL("**/edit", { timeout: 10000 })
    } else {
      await editLink.click()
      await page.waitForURL("**/edit", { timeout: 10000 })
    }

    const editUrl = page.url()
    const formId = editUrl.split("/forms/")[1].split("/edit")[0]
    console.log(`Working with form ID: ${formId}`)

    // Ensure form has questions
    const questionCards = page.locator('.relative.mb-3.rounded-lg.border')
    if ((await questionCards.count()) === 0) {
      console.log("Adding question...")
      await page.click('button:has-text("Short Text")')
      await page.waitForTimeout(1000)
    }

    // Ensure form is published so slug is publicly accessible
    const publishBtn = page.locator('button:has-text("Publish Form")')
    if (await publishBtn.isVisible()) {
      console.log("Publishing form first...")
      await publishBtn.click()
      await page.waitForTimeout(1500)
    }

    // Fetch initial slug from Supabase
    const { data: initialFormData, error: initialFormErr } = await supabaseAdmin
      .from("forms")
      .select("slug, settings")
      .eq("id", formId)
      .single()

    const initialSlug = initialFormData?.slug
    console.log(`Initial Form Slug: ${initialSlug}`)

    // ----------------------------------------------------
    // TEST PART 1: SETTINGS-EDIT SLUG REGENERATION
    // ----------------------------------------------------
    console.log("\n--- TEST 1: SETTINGS-EDIT SLUG REGENERATION ---")
    await page.click('button:has-text("Settings")')
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 })
    console.log("Form Settings dialog opened.")

    const dialog = page.locator('div[role="dialog"]')

    // Toggle Regenerate Slug checkbox
    const slugToggle = dialog.locator('#regenerate-slug-toggle')
    await slugToggle.scrollIntoViewIfNeeded()
    await slugToggle.check()
    console.log("Checked 'Regenerate Form Link / Slug' toggle.")

    // Click Done to save settings
    await dialog.locator('button:has-text("Done")').click()
    await page.waitForTimeout(1500)
    console.log("Saved settings with slug regeneration.")

    // Fetch updated form from Supabase
    const { data: updatedFormData } = await supabaseAdmin
      .from("forms")
      .select("slug, settings")
      .eq("id", formId)
      .single()

    const newSlug = updatedFormData?.slug
    console.log(`New Form Slug in Supabase: ${newSlug}`)

    if (!newSlug || newSlug === initialSlug) {
      throw new Error(`Slug was not regenerated! Old: ${initialSlug}, New: ${newSlug}`)
    }
    console.log(`✓ Slug successfully regenerated from '${initialSlug}' to '${newSlug}'!`)
    results.slugRegeneration = true
    results.details.push(`Slug regenerated from ${initialSlug} to ${newSlug}`)

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "slug_regenerated_builder.png") })

    // Verify old slug returns Form Not Available / blocked
    const oldSlugPage = await context.newPage()
    const oldRes = await oldSlugPage.goto(`${BASE_URL}/f/${initialSlug}`)
    const oldStatus = oldRes.status()
    const oldContent = await oldSlugPage.content()
    const isOldBlocked = oldStatus === 404 || oldContent.includes("Form Not Available") || oldContent.includes("not published")
    console.log(`Old slug URL status: ${oldStatus}, blocked as expected: ${isOldBlocked}`)
    if (!isOldBlocked) {
      throw new Error("Old slug was still accessible after regeneration!")
    }
    await oldSlugPage.close()

    // ----------------------------------------------------
    // TEST PART 2: CONVERSATIONAL-MODE PASSWORD STEP
    // ----------------------------------------------------
    console.log("\n--- TEST 2: CONVERSATIONAL-MODE PASSWORD STEP ---")
    // Re-open settings to enable Conversational Mode & Password Protection
    await page.click('button:has-text("Settings")')
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 })

    const settingsDialog = page.locator('div[role="dialog"]')

    // 1. Enable password protection
    const passwordCheckbox = settingsDialog.locator('#password-toggle')
    if (!(await passwordCheckbox.isChecked())) {
      await passwordCheckbox.check()
    }
    const passwordInput = settingsDialog.locator('input[placeholder="Enter access password"]')
    await passwordInput.fill("convpass123")

    // 2. Enable Conversational Mode
    const convToggle = settingsDialog.locator('#conversational-mode-toggle')
    await convToggle.scrollIntoViewIfNeeded()
    if (!(await convToggle.isChecked())) {
      await convToggle.check()
    }

    // Save settings
    await settingsDialog.locator('button:has-text("Done")').click()
    await page.waitForTimeout(1500)
    console.log("Settings updated: Conversational Mode = ON, Password = 'convpass123'.")

    // Verify settings in Supabase
    const { data: convFormCheck } = await supabaseAdmin
      .from("forms")
      .select("settings, slug")
      .eq("id", formId)
      .single()

    console.log("Supabase settings conversational_mode:", convFormCheck.settings?.conversational_mode)
    console.log("Supabase settings has password_hash:", Boolean(convFormCheck.settings?.password_hash))

    const activeSlug = convFormCheck.slug
    console.log(`Testing public form fill at: ${BASE_URL}/f/${activeSlug}`)

    // Open public URL in a fresh incognito context (anonymous user)
    const incognitoContext = await browser.newContext()
    const publicPage = await incognitoContext.newPage()
    await publicPage.goto(`${BASE_URL}/f/${activeSlug}`, { waitUntil: "networkidle" })

    // Check for conversational password step
    const convPasswordStep = publicPage.locator('[data-testid="conversational-password-step"]')
    await convPasswordStep.waitFor({ state: "visible", timeout: 8000 })
    console.log("✓ Conversational Password Step is visible on screen!")

    await publicPage.screenshot({ path: path.join(SCREENSHOT_DIR, "conversational_password_step.png") })

    // Attempt Wrong Password
    console.log("Entering wrong password ('badpass')...")
    const passInput = publicPage.locator('[data-testid="conversational-password-input"]')
    await passInput.fill("badpass")
    await publicPage.click('[data-testid="conversational-unlock-btn"]')
    await publicPage.waitForTimeout(1000)

    const errLocator = publicPage.locator('[data-testid="conversational-password-error"]')
    await errLocator.waitFor({ state: "visible", timeout: 4000 })
    const errText = await errLocator.textContent()
    console.log(`✓ Error correctly displayed for wrong password: "${errText}"`)
    await publicPage.screenshot({ path: path.join(SCREENSHOT_DIR, "conversational_password_wrong.png") })

    // Enter Correct Password
    console.log("Entering correct password ('convpass123')...")
    await passInput.fill("convpass123")
    await publicPage.click('[data-testid="conversational-unlock-btn"]')
    await publicPage.waitForTimeout(1500)

    // Verify Conversational Questions Unlocked
    await convPasswordStep.waitFor({ state: "hidden", timeout: 5000 })
    console.log("✓ Password step dismissed after unlocking!")

    const q1Indicator = publicPage.locator('text=/Question 1 of/i')
    await q1Indicator.waitFor({ state: "visible", timeout: 5000 })
    console.log("✓ Question 1 in Conversational Mode is active and visible!")
    results.conversationalPasswordStep = true

    await publicPage.screenshot({ path: path.join(SCREENSHOT_DIR, "conversational_unlocked_q1.png") })

    // ----------------------------------------------------
    // TEST PART 3: CONVERSATIONAL ADVANCE & SUBMISSION
    // ----------------------------------------------------
    console.log("\n--- TEST 3: CONVERSATIONAL QUESTION ADVANCE & SUBMISSION ---")
    // Fill text input for active question
    const textInput = publicPage.locator('input[type="text"]').first()
    if (await textInput.isVisible()) {
      await textInput.fill("Conversational Mode Answer 1")
    }

    const nextBtn = publicPage.locator('[data-testid="conversational-next-btn"]')
    while (await nextBtn.isVisible()) {
      console.log("Advancing to next conversational question...")
      const currInput = publicPage.locator('input[type="text"]').first()
      if (await currInput.isVisible()) await currInput.fill("Conversational Mode Answer")
      await nextBtn.click()
      await publicPage.waitForTimeout(600)
    }

    const submitBtn = publicPage.locator('[data-testid="conversational-submit-btn"]')
    await submitBtn.waitFor({ state: "visible", timeout: 5000 })
    console.log("Submitting conversational form...")
    await submitBtn.evaluate((b) => b.click())

    // Wait for submission completion message
    await publicPage.waitForSelector('text=/Thank you|Your response has been recorded/i', { timeout: 15000 })
    console.log("✓ Form response successfully submitted in Conversational Mode!")
    results.conversationalNavigationAndSubmit = true
    results.details.push("Successfully answered conversational questions and submitted form")

    await publicPage.screenshot({ path: path.join(SCREENSHOT_DIR, "conversational_submitted.png") })
    await incognitoContext.close()

    // Cleanup: Reset conversational_mode & password on form in DB so other suites stay clean
    await supabaseAdmin
      .from("forms")
      .update({
        settings: {
          ...convFormCheck.settings,
          conversational_mode: false,
          password_hash: null,
        },
      })
      .eq("id", formId)

    console.log("\n=== ALL CONVERSATIONAL & SLUG TESTS PASSED ===")
  } catch (err) {
    console.error("\n❌ TEST FAILURE:", err)
    results.error = err.message
  } finally {
    await browser.close()
  }

  fs.writeFileSync(
    path.join(__dirname, "../e2e-conversational-slug-results.json"),
    JSON.stringify(results, null, 2)
  )

  if (!results.slugRegeneration || !results.conversationalPasswordStep || !results.conversationalNavigationAndSubmit) {
    process.exit(1)
  }
}

runTests()
