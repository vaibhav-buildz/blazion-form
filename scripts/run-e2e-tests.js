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

async function getLatestOtp(email) {
  const { data, error } = await supabaseAdmin
    .from("email_otp_verifications")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
  if (error || !data || data.length === 0) return null
  return data[0].otp || data[0].code
}

async function handlePasswordGateIfPresent(targetPage, pass = "testpass123") {
  const passInput = targetPage.locator('input[placeholder="Enter password"]')
  if (await passInput.isVisible()) {
    console.log("[E2E HELPER] Password gate detected. Unlocking with password...")
    await passInput.fill(pass)
    await targetPage.click('button[type="submit"]')
    await targetPage.waitForTimeout(1000)
  }
}

async function fillAllVisibleFields(targetPage, valuePrefix = "Answer") {
  const inputs = targetPage.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea')
  const count = await inputs.count()
  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i)
    if (await input.isVisible()) {
      await input.fill(`${valuePrefix} ${i + 1}`)
    }
  }
}

async function runAllTests() {
  console.log("=== STARTING REAL BROWSER E2E TESTS (MS Edge) ===")
  const browser = await chromium.launch({ channel: "msedge", headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const testResults = []

  try {
    // ----------------------------------------------------
    // PREPARATION: Login & Ensure Test Form Exists
    // ----------------------------------------------------
    console.log("\n[SETUP] Logging in to dashboard...")
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL("**/dashboard", { timeout: 10000 })
    console.log("[SETUP] Successfully logged in to Dashboard")

    // Check if we have an existing form or create one
    const editLink = page.locator('a[href*="/edit"]').first()
    if ((await editLink.count()) === 0) {
      console.log("[SETUP] Creating a new form...")
      await page.click('button:has-text("Create Form")')
      await page.waitForURL("**/edit", { timeout: 10000 })
    } else {
      console.log("[SETUP] Opening existing form for editing...")
      await editLink.click()
      await page.waitForURL("**/edit", { timeout: 10000 })
    }

    const editUrl = page.url()
    const formId = editUrl.split("/forms/")[1].split("/edit")[0]
    console.log(`[SETUP] Currently editing form ID: ${formId}`)

    // Add a text question if form is empty
    const questionCards = page.locator('.relative.mb-3.rounded-lg.border')
    if ((await questionCards.count()) === 0) {
      console.log("[SETUP] Adding default question...")
      await page.click('button:has-text("Short Text")')
      await page.waitForTimeout(1000)
    }

    // ----------------------------------------------------
    // TEST 1: SETTINGS PERSISTENCE
    // ----------------------------------------------------
    console.log("\n--- TEST 1: SETTINGS PERSISTENCE ---")
    let test1Passed = false
    let test1Details = ""

    // Open Settings dialog
    await page.click('button:has-text("Settings")')
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 })
    console.log("[TEST 1] Settings dialog opened")

    const dialog = page.locator('div[role="dialog"]')

    // Expiry: 5 mins from now
    const now = new Date()
    const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000)
    const year = fiveMinLater.getFullYear()
    const month = String(fiveMinLater.getMonth() + 1).padStart(2, '0')
    const day = String(fiveMinLater.getDate()).padStart(2, '0')
    const hours = String(fiveMinLater.getHours()).padStart(2, '0')
    const minutes = String(fiveMinLater.getMinutes()).padStart(2, '0')

    const dateVal = `${year}-${month}-${day}`
    const timeVal = `${hours}:${minutes}`

    console.log(`[TEST 1] Setting expiry date to: ${dateVal} ${timeVal}`)

    await dialog.locator('input[type="date"]').fill(dateVal)
    await dialog.locator('input[type="time"]').fill(timeVal)

    // Response Limit = 2
    const limitInput = dialog.locator('input[type="number"]')
    await limitInput.fill("2")

    // Password Protect
    const passwordCheckbox = dialog.locator('#password-toggle')
    if (!(await passwordCheckbox.isChecked())) {
      await passwordCheckbox.check()
    }
    const passwordInput = dialog.locator('input[placeholder="Enter access password"]')
    await passwordInput.fill("testpass123")

    // Ensure standard mode for multi-step sections test
    const convToggle = dialog.locator('#conversational-mode-toggle')
    if (await convToggle.isChecked()) {
      await convToggle.uncheck()
    }

    // Mode = OTP
    await dialog.locator('#verify-otp').click()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/test1_before_done.png` })

    // Click Done
    await dialog.locator('button:has-text("Done")').click()
    await page.waitForSelector('text=Form Settings', { state: "hidden", timeout: 5000 })
    console.log("[TEST 1] Clicked Done")

    // Reopen dialog immediately (1st check)
    await page.click('button:has-text("Settings")')
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 })

    const date1Val = await dialog.locator('input[type="date"]').inputValue()
    const time1Val = await dialog.locator('input[type="time"]').inputValue()
    const limit1Val = await dialog.locator('input[type="number"]').inputValue()
    const pass1Checked = await dialog.locator('#password-toggle').isChecked()
    const pass1Notice = await dialog.locator('p:has-text("Password protection is currently enabled")').isVisible()
    const otp1Checked = (await dialog.locator('#verify-otp').getAttribute('aria-checked')) === 'true' || (await dialog.locator('#verify-otp').getAttribute('data-state')) === 'checked'

    console.log("[TEST 1 Immediate Check]:", {
      dateVal: date1Val,
      timeVal: time1Val,
      limitVal: limit1Val,
      passChecked: pass1Checked,
      passNoticeVisible: pass1Notice,
      otpChecked: otp1Checked
    })

    // Close dialog
    await dialog.locator('button:has-text("Cancel")').click()
    await page.waitForSelector('text=Form Settings', { state: "hidden" })

    // Hard refresh (F5)
    console.log("[TEST 1] Performing hard refresh (F5)...")
    await page.reload({ waitUntil: "networkidle" })

    // Reopen dialog (2nd check after F5)
    await page.click('button:has-text("Settings")')
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 })

    const date2Val = await dialog.locator('input[type="date"]').inputValue()
    const time2Val = await dialog.locator('input[type="time"]').inputValue()
    const limit2Val = await dialog.locator('input[type="number"]').inputValue()
    const pass2Checked = await dialog.locator('#password-toggle').isChecked()
    const pass2Notice = await dialog.locator('p:has-text("Password protection is currently enabled")').isVisible()
    const otp2Checked = (await dialog.locator('#verify-otp').getAttribute('aria-checked')) === 'true' || (await dialog.locator('#verify-otp').getAttribute('data-state')) === 'checked'

    console.log("[TEST 1 Post-F5 Check]:", {
      dateVal: date2Val,
      timeVal: time2Val,
      limitVal: limit2Val,
      passChecked: pass2Checked,
      passNoticeVisible: pass2Notice,
      otpChecked: otp2Checked
    })

    await page.screenshot({ path: `${SCREENSHOT_DIR}/test1_after_refresh.png` })
    // Close dialog from 2nd check
    await dialog.locator('button:has-text("Cancel")').click()
    await page.waitForSelector('text=Form Settings', { state: "hidden" })
    
    // Open dialog to disable OTP for subsequent tests
    await page.click('button:has-text("Settings")')
    await page.waitForSelector('text=Form Settings', { timeout: 5000 })
    await page.locator('#verify-none').click()
    await dialog.locator('button:has-text("Done")').click()
    await page.waitForSelector('text=Form Settings', { state: "hidden" })

    if (
      date1Val === date2Val && time1Val === time2Val && limit1Val === "2" && limit2Val === "2" &&
      pass1Checked && pass2Checked && pass1Notice && pass2Notice && otp1Checked && otp2Checked
    ) {
      test1Passed = true
      test1Details = `All 4 settings (Date=${date2Val}, Time=${time2Val}, Limit=${limit2Val}, Password=Enabled, Mode=OTP) persisted correctly before and after F5 refresh.`
    } else {
      test1Details = `Mismatch found in settings persistence check.`
    }
    testResults.push({ test: 1, name: "SETTINGS PERSISTENCE", result: test1Passed ? "PASS" : "FAIL", details: test1Details })

    // ----------------------------------------------------
    // TEST 2: RESPONSE LIMIT ENFORCEMENT
    // ----------------------------------------------------
    console.log("\n--- TEST 2: RESPONSE LIMIT ENFORCEMENT ---")
    let test2Passed = false
    let test2Details = ""

    // Clear prior responses so quota starts from 0
    await supabaseAdmin.from("responses").delete().eq("form_id", formId)

    // Turn off password & expiry for clean limit test, keep limit=2, mode=none
    await page.click('button:has-text("Settings")')
    await page.waitForSelector('div[role="dialog"]')

    if (await dialog.locator('#password-toggle').isChecked()) {
      await dialog.locator('#password-toggle').uncheck()
    }
    const convToggle2 = dialog.locator('#conversational-mode-toggle')
    if (await convToggle2.isChecked()) {
      await convToggle2.uncheck()
    }
    const clearExpiryBtn = dialog.locator('button:has-text("Clear Expiry")')
    if (await clearExpiryBtn.isVisible()) {
      await clearExpiryBtn.click()
    }
    await dialog.locator('#verify-none').click()
    await dialog.locator('button:has-text("Done")').click()
    await page.waitForSelector('text=Form Settings', { state: "hidden" })

    // Publish form
    console.log("[TEST 2] Publishing form...")
    const oldSlugInput = (await page.locator('input[readonly]').count()) > 0 ? await page.locator('input[readonly]').inputValue() : ""
    const publishBtn = page.locator('button:text-is("Publish")')
    if (await publishBtn.isVisible()) {
      await publishBtn.click()
      await page.waitForSelector('button:has-text("Unpublish to Edit")', { timeout: 10000 })
      if (oldSlugInput) {
        await page.waitForFunction(
          (prev) => {
            const el = document.querySelector('input[readonly]')
            return el && el.value && el.value !== prev
          },
          oldSlugInput,
          { timeout: 10000 }
        ).catch(() => {})
      }
    }
    await page.waitForSelector('input[readonly]', { timeout: 10000 })
    const publicUrl = await page.locator('input[readonly]').inputValue()
    console.log(`[TEST 2] Form Public URL: ${publicUrl}`)

    // Create fresh logged-out context for submissions
    const submissionContext = await browser.newContext()
    const subPage = await submissionContext.newPage()

    // Response 1
    console.log("[TEST 2] Submitting Response #1...")
    await subPage.goto(publicUrl)
    await subPage.waitForTimeout(1000)
    await handlePasswordGateIfPresent(subPage, "testpass123")
    await fillAllVisibleFields(subPage, "Response 1")
    await subPage.click('button[type="submit"]')
    try {
      await subPage.waitForSelector('text=Thank', { timeout: 25000 })
    } catch (e) {
      await subPage.screenshot({ path: `${SCREENSHOT_DIR}/test2_submission_failed.png` })
      throw e
    }
    console.log("[TEST 2] Response #1 submitted successfully")

    // Response 2
    console.log("[TEST 2] Submitting Response #2...")
    await subPage.goto(publicUrl)
    await subPage.waitForTimeout(1000)
    await handlePasswordGateIfPresent(subPage, "testpass123")
    await fillAllVisibleFields(subPage, "Response 2")
    await subPage.click('button[type="submit"]')
    await subPage.waitForSelector('text=Thank', { timeout: 25000 })
    console.log("[TEST 2] Response #2 submitted successfully")

    // Response 3 (Attempt)
    console.log("[TEST 2] Attempting Response #3 (expecting limit reached)...")
    await subPage.goto(publicUrl)
    await subPage.waitForTimeout(2000)
    await handlePasswordGateIfPresent(subPage, "testpass123")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/test2_response3_limit.png` })

    const limitMsgVisible =
      (await subPage.locator('text=response limit reached').isVisible()) ||
      (await subPage.locator('text=no longer accepting responses').isVisible()) ||
      (await subPage.locator('text=Limit Reached').isVisible()) ||
      (await subPage.locator('text=Closed').isVisible())

    console.log(`[TEST 2] Response limit notice visible: ${limitMsgVisible}`)

    if (limitMsgVisible) {
      test2Passed = true
      test2Details = "Responses 1 & 2 submitted cleanly. 3rd attempt correctly blocked with response limit notice."
    } else {
      test2Details = "3rd attempt was not blocked by response limit."
    }
    testResults.push({ test: 2, name: "RESPONSE LIMIT ENFORCEMENT", result: test2Passed ? "PASS" : "FAIL", details: test2Details })
    await submissionContext.close()

    // ----------------------------------------------------
    // TEST 3: REPUBLISH URL
    // ----------------------------------------------------
    console.log("\n--- TEST 3: REPUBLISH URL ---")
    let test3Passed = false
    let test3Details = ""

    const oldPublicUrl = publicUrl
    console.log(`[TEST 3] Old Public URL: ${oldPublicUrl}`)

    // Unpublish
    console.log("[TEST 3] Unpublishing form...")
    await page.click('button:has-text("Unpublish")')
    await page.waitForTimeout(2000)

    // Edit form title
    const titleInput = page.locator('input[placeholder="Untitled Form"]').first()
    await titleInput.fill("Republished Title V2")
    await page.waitForTimeout(1000)

    // Publish
    console.log("[TEST 3] Republishing form...")
    await page.click('button:has-text("Publish")')
    await page.waitForTimeout(2000)

    const newPublicUrl = await page.locator('input[readonly]').inputValue()
    console.log(`[TEST 3] New Public URL: ${newPublicUrl}`)

    const urlsDifferent = oldPublicUrl !== newPublicUrl
    console.log(`[TEST 3] Old URL differs from New URL: ${urlsDifferent}`)

    // Check old URL in logged-out browser
    const checkContext = await browser.newContext()
    const checkPage = await checkContext.newPage()
    await checkPage.goto(oldPublicUrl)
    await checkPage.waitForTimeout(2000)
    await checkPage.screenshot({ path: `${SCREENSHOT_DIR}/test3_old_url.png` })

    const oldUrlNotAvailable =
      (await checkPage.locator('text=Form not found').isVisible()) ||
      (await checkPage.locator('text=not available').isVisible()) ||
      (await checkPage.locator('text=404').isVisible())

    console.log(`[TEST 3] Old URL shows unavailable message: ${oldUrlNotAvailable}`)

    if (urlsDifferent && oldUrlNotAvailable) {
      test3Passed = true
      test3Details = `Old URL (${oldPublicUrl}) and New URL (${newPublicUrl}) are distinct, and Old URL correctly displays 'Form not found or not published'.`
    } else {
      test3Details = `URL check failed. Different=${urlsDifferent}, OldUnavailable=${oldUrlNotAvailable}`
    }
    testResults.push({ test: 3, name: "REPUBLISH URL", result: test3Passed ? "PASS" : "FAIL", details: test3Details })
    await checkContext.close()

    // ----------------------------------------------------
    // TEST 4: LOGIN-MODE VERIFICATION
    // ----------------------------------------------------
    console.log("\n--- TEST 4: LOGIN-MODE VERIFICATION ---")
    let test4Passed = false
    let test4Details = ""

    // Set mode = login on current form
    await page.click('button:has-text("Settings")')
    await page.waitForSelector('div[role="dialog"]')
    const limitField = dialog.locator('input[type="number"]')
    await limitField.fill("")
    await dialog.locator('#verify-login').click()
    await dialog.locator('button:has-text("Done")').click()
    await page.waitForSelector('div[role="dialog"]', { state: "detached" })

    const loginModeUrl = await page.locator('input[readonly]').inputValue()
    console.log(`[TEST 4] Form URL for Login Mode test: ${loginModeUrl}`)

    // Logged out context
    const loginTestContext = await browser.newContext()
    const loginTestPage = await loginTestContext.newPage()
    await loginTestPage.goto(loginModeUrl)
    await loginTestPage.waitForTimeout(2000)
    await handlePasswordGateIfPresent(loginTestPage, "testpass123")
    await loginTestPage.screenshot({ path: `${SCREENSHOT_DIR}/test4_login_gate.png` })

    const loginGateVisible =
      (await loginTestPage.locator('text=Log in to respond').isVisible()) ||
      (await loginTestPage.locator('text=Authentication Required').isVisible()) ||
      (await loginTestPage.locator('a:has-text("Log in")').isVisible())

    console.log(`[TEST 4] Login gate visible for logged-out user: ${loginGateVisible}`)

    // Click Log in
    const loginBtn = loginTestPage.locator('a:has-text("Log in"), button:has-text("Log in")').first()
    await loginBtn.click()
    await loginTestPage.waitForURL("**/login**", { timeout: 5000 })
    await loginTestPage.fill('input[type="email"]', TEST_EMAIL)
    await loginTestPage.fill('input[type="password"]', TEST_PASSWORD)
    await loginTestPage.click('button[type="submit"]')

    // Wait for redirect back to form
    await loginTestPage.waitForURL(loginModeUrl, { timeout: 10000 })
    console.log("[TEST 4] Successfully redirected back to form after login")
    await handlePasswordGateIfPresent(loginTestPage, "testpass123")
    await loginTestPage.screenshot({ path: `${SCREENSHOT_DIR}/test4_after_login.png` })

    const verifiedBadgeVisible = await loginTestPage.locator('text=Verified as:').isVisible()
    const emailInputsCount = await loginTestPage.locator('input[placeholder*="email"], input[type="email"]').count()

    console.log(`[TEST 4] Verified badge visible: ${verifiedBadgeVisible}`)
    console.log(`[TEST 4] Duplicate email inputs count: ${emailInputsCount}`)

    if (loginGateVisible && verifiedBadgeVisible && emailInputsCount === 0) {
      test4Passed = true
      test4Details = "Login gate correctly blocked unauthenticated user. After login, redirected back to form with Verified Badge shown and 0 duplicate email inputs."
    } else {
      test4Details = `Login mode check failed. Gate=${loginGateVisible}, Badge=${verifiedBadgeVisible}, EmailInputs=${emailInputsCount}`
    }
    testResults.push({ test: 4, name: "LOGIN-MODE VERIFICATION", result: test4Passed ? "PASS" : "FAIL", details: test4Details })
    await loginTestContext.close()

    // ----------------------------------------------------
    // TEST 5: OTP-MODE VERIFICATION
    // ----------------------------------------------------
    console.log("\n--- TEST 5: OTP-MODE VERIFICATION ---")
    let test5Passed = false
    let test5Details = ""

    // Set mode = otp on current form
    await page.click('button:has-text("Settings")')
    await page.waitForSelector('div[role="dialog"]')
    await dialog.locator('#verify-otp').click()
    await dialog.locator('button:has-text("Done")').click()
    await page.waitForSelector('div[role="dialog"]', { state: "detached" })

    const otpModeUrl = await page.locator('input[readonly]').inputValue()
    console.log(`[TEST 5] Form URL for OTP Mode test: ${otpModeUrl}`)

    const otpContext = await browser.newContext()
    const otpPage = await otpContext.newPage()
    await otpPage.goto(otpModeUrl)
    await otpPage.waitForTimeout(2000)
    await handlePasswordGateIfPresent(otpPage, "testpass123")

    const resendAllowedEmail = "vaibhav993548@gmail.com"
    console.log(`[TEST 5] Entering email: ${resendAllowedEmail}`)
    await otpPage.fill('input[type="email"]', resendAllowedEmail)
    await otpPage.click('button:has-text("Send Code"), button:has-text("Send OTP")')
    await otpPage.waitForTimeout(3000)
    console.log("[TEST 5] OTP code requested")

    // Test WRONG code first
    console.log("[TEST 5] Entering WRONG code (999999)...")
    await otpPage.fill('input[placeholder*="code"], input[placeholder*="OTP"], input[type="text"]', "999999")
    await otpPage.click('button:has-text("Verify")')
    await otpPage.waitForTimeout(2000)
    await otpPage.screenshot({ path: `${SCREENSHOT_DIR}/test5_wrong_otp.png` })

    const wrongCodeErrorVisible =
      (await otpPage.locator('text=Invalid').first().isVisible()) ||
      (await otpPage.locator('text=expired').first().isVisible()) ||
      (await otpPage.locator('text=incorrect').first().isVisible())

    console.log(`[TEST 5] Wrong code error displayed: ${wrongCodeErrorVisible}`)

    // Fetch CORRECT code from DB
    const realOtpCode = await getLatestOtp(resendAllowedEmail)
    console.log(`[TEST 5] Retrieved actual OTP from database: ${realOtpCode}`)

    if (realOtpCode) {
      await otpPage.fill('input[placeholder*="code"], input[placeholder*="OTP"], input[type="text"]', String(realOtpCode))
      await otpPage.click('button:has-text("Verify")')
      await otpPage.waitForTimeout(2000)
      await otpPage.screenshot({ path: `${SCREENSHOT_DIR}/test5_correct_otp.png` })

      const formUnlocked = await otpPage.locator('button[type="submit"]').isVisible()
      console.log(`[TEST 5] Form unlocked after correct OTP: ${formUnlocked}`)

      if (wrongCodeErrorVisible && formUnlocked) {
        test5Passed = true
        test5Details = `Wrong code (999999) correctly rejected with error. Real code (${realOtpCode}) verified successfully and unlocked the form.`
      } else {
        test5Details = `OTP check failed. WrongCodeRejected=${wrongCodeErrorVisible}, FormUnlocked=${formUnlocked}`
      }
    } else {
      test5Details = "Failed to retrieve OTP code from database."
    }
    testResults.push({ test: 5, name: "OTP-MODE VERIFICATION", result: test5Passed ? "PASS" : "FAIL", details: test5Details })
    await otpContext.close()

    // ----------------------------------------------------
    // TEST 6: MULTI-STEP FLOW
    // ----------------------------------------------------
    console.log("\n--- TEST 6: MULTI-STEP FLOW ---")
    let test6Passed = false
    let test6Details = ""

    // Unpublish first so the form is editable
    const unpublishBtn = page.locator('button:has-text("Unpublish")')
    if (await unpublishBtn.isVisible()) {
      console.log("[TEST 6] Unpublishing form to allow edits...")
      await unpublishBtn.click()
      await page.waitForTimeout(1000)
    }

    // Clear settings to mode=none
    await page.click('button:has-text("Settings")')
    await page.waitForSelector('div[role="dialog"]')
    await dialog.locator('#verify-none').click()
    await dialog.locator('button:has-text("Done")').click()
    await page.waitForSelector('text=Form Settings', { state: "hidden" })

    // Add Section Break if not present
    await page.click('button:has-text("Section Break")')
    await page.waitForTimeout(1000)

    // Add another short text question after section break
    await page.click('button:has-text("Short Text")')
    await page.waitForTimeout(1000)

    // Publish form
    if (await page.locator('button:has-text("Publish")').isVisible()) {
      await page.click('button:has-text("Publish")')
      await page.waitForTimeout(2000)
    }

    const multiStepUrl = await page.locator('input[readonly]').inputValue()
    console.log(`[TEST 6] Multi-step Form URL: ${multiStepUrl}`)

    const multiStepContext = await browser.newContext()
    const msPage = await multiStepContext.newPage()
    await msPage.goto(multiStepUrl)
    await msPage.waitForTimeout(2000)
    await handlePasswordGateIfPresent(msPage, "testpass123")

    // Fill Section 1
    console.log("[TEST 6] Filling Section 1...")
    await fillAllVisibleFields(msPage, "Section 1")
    await msPage.screenshot({ path: `${SCREENSHOT_DIR}/test6_sec1.png` })

    // Click Next
    console.log("[TEST 6] Clicking Next button...")
    await msPage.click('button:has-text("Next")')
    await msPage.waitForTimeout(1500)

    // Verify it did NOT submit early
    const earlySubmitted = await msPage.locator('text=Thank').isVisible()
    const nextStepVisible = (await msPage.locator('button:has-text("Submit")').isVisible()) || (await msPage.locator('button:has-text("Previous")').isVisible())

    console.log(`[TEST 6] Early submission occurred: ${earlySubmitted}`)
    console.log(`[TEST 6] Step 2 / Submit button visible: ${nextStepVisible}`)

    await msPage.screenshot({ path: `${SCREENSHOT_DIR}/test6_sec2.png` })

    // Fill Section 2
    await fillAllVisibleFields(msPage, "Section 2")

    // Click Submit
    console.log("[TEST 6] Clicking Submit button...")
    await msPage.click('button:has-text("Submit")')
    await msPage.waitForSelector('text=Thank', { timeout: 25000 })

    const finalSubmitted = await msPage.locator('text=Thank').isVisible()
    console.log(`[TEST 6] Final Thank You screen visible: ${finalSubmitted}`)

    if (!earlySubmitted && nextStepVisible && finalSubmitted) {
      test6Passed = true
      test6Details = "Section 1 'Next' advanced cleanly to Section 2 without early submission. Section 2 'Submit' completed submission and displayed Thank You screen."
    } else {
      test6Details = `Multi-step check failed. EarlySubmitted=${earlySubmitted}, Step2Visible=${nextStepVisible}, FinalSubmitted=${finalSubmitted}`
    }
    testResults.push({ test: 6, name: "MULTI-STEP FLOW", result: test6Passed ? "PASS" : "FAIL", details: test6Details })
    await multiStepContext.close()

    // Cleanup extra section breaks added in Test 6 so form is ready for subsequent runs
    await supabaseAdmin.from("questions").delete().eq("form_id", formId).eq("type", "section_break")

  } catch (err) {
    console.error("FATAL E2E ERROR:", err)
  } finally {
    await browser.close()
    console.log("\n=== E2E TEST RESULTS SUMMARY ===")
    console.table(testResults)
    fs.writeFileSync(path.join(__dirname, "../e2e-results.json"), JSON.stringify(testResults, null, 2))
  }
}

runAllTests()
