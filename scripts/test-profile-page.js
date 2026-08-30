const { chromium } = require("playwright")
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

const BASE_URL = "http://localhost:3000"
const TEST_EMAIL = "e2e-test@example.com"
const TEST_PASSWORD = "Password123!"
const SCREENSHOT_DIR = path.join(__dirname, "../e2e-screenshots")

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function runProfilePageTests() {
  console.log("=== STARTING PLAYWRIGHT PROFILE PAGE TESTS ===")
  const browser = await chromium.launch({ channel: "msedge", headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const results = []

  try {
    // ----------------------------------------------------
    // STEP 1: Login & Navigate to Profile Page
    // ----------------------------------------------------
    console.log("\n[STEP 1] Logging in to dashboard...")
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL("**/dashboard**", { timeout: 15000 })
    console.log("[STEP 1] Logged in successfully.")

    console.log("[STEP 1] Navigating to Profile page...")
    await page.click('a[href="/dashboard/profile"]')
    await page.waitForURL("**/dashboard/profile", { timeout: 10000 })
    await page.waitForTimeout(1000)

    // Verify all 5 sections render
    console.log("[STEP 1] Verifying all 5 profile sections render...")
    const profileInfoHeading = page.getByText('Profile Info', { exact: true })
    const orgBrandingHeading = page.getByText('Organisation Branding', { exact: true })
    const changePasswordHeading = page.getByText('Change Password', { exact: true })
    const notificationHeading = page.getByText('Notification Preferences', { exact: true })
    const dangerZoneHeading = page.getByText('Danger Zone', { exact: true })

    const v1 = await profileInfoHeading.isVisible()
    const v2 = await orgBrandingHeading.isVisible()
    const v3 = await changePasswordHeading.isVisible()
    const v4 = await notificationHeading.isVisible()
    const v5 = await dangerZoneHeading.isVisible()

    const allSectionsVisible = v1 && v2 && v3 && v4 && v5
    console.log(`[STEP 1] Sections rendered: ProfileInfo=${v1}, OrgBranding=${v2}, Password=${v3}, Notifications=${v4}, DangerZone=${v5}`)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/profile_sections.png` })
    results.push({
      test: 1,
      name: "PROFILE SECTIONS RENDERING",
      result: allSectionsVisible ? "PASS" : "FAIL",
      details: allSectionsVisible ? "All 5 sections rendered correctly." : "Missing section components.",
    })

    // ----------------------------------------------------
    // STEP 2: Edit Display Name & Verify Persistence
    // ----------------------------------------------------
    console.log("\n[STEP 2] Testing display name edit & reload persistence...")
    const testDisplayName = `E2E Tester ${Date.now().toString().slice(-4)}`
    const displayNameInput = page.locator('#display-name')

    await displayNameInput.fill(testDisplayName)
    await page.click('button:has-text("Save Profile Info")')
    await page.waitForTimeout(2000)

    // Reload page to verify persistence
    console.log("[STEP 2] Reloading page to check persistence...")
    await page.reload()
    await page.waitForTimeout(1500)

    const reloadedValue = await page.locator('#display-name').inputValue()
    const isPersisted = reloadedValue === testDisplayName

    console.log(`[STEP 2] Display name after reload: "${reloadedValue}" (expected: "${testDisplayName}") -> ${isPersisted ? "PERSISTED" : "FAILED"}`)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/profile_display_name.png` })

    results.push({
      test: 2,
      name: "EDIT DISPLAY NAME PERSISTENCE",
      result: isPersisted ? "PASS" : "FAIL",
      details: isPersisted ? `Display name updated to '${testDisplayName}' and persisted across page reload.` : `Reload value '${reloadedValue}' mismatch.`,
    })

    // ----------------------------------------------------
    // STEP 3: Test Delete Account Confirmation Modal Flow
    // ----------------------------------------------------
    console.log("\n[STEP 3] Testing Delete Account confirmation modal flow...")
    await page.click('button:has-text("Delete Account")')
    await page.waitForSelector('div[role="dialog"]', { state: "visible", timeout: 5000 })

    const modalVisible = await page.locator('text=Confirm Account Deletion').isVisible()
    const confirmInput = page.locator('#delete-confirm-input')
    const confirmDeleteBtn = page.locator('button:has-text("Permanently Delete Account")')

    // Initially disabled when empty
    const initialDisabled = await confirmDeleteBtn.isDisabled()

    // Fill incorrect string -> still disabled
    await confirmInput.fill("WRONG_TEXT")
    await page.waitForTimeout(300)
    const wrongDisabled = await confirmDeleteBtn.isDisabled()

    // Fill correct string "DELETE" -> becomes enabled
    await confirmInput.fill("DELETE")
    await page.waitForTimeout(300)
    const correctEnabled = !(await confirmDeleteBtn.isDisabled())

    console.log(`[STEP 3] Modal Visible=${modalVisible}, InitialDisabled=${initialDisabled}, WrongTextDisabled=${wrongDisabled}, CorrectTextEnabled=${correctEnabled}`)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/profile_delete_modal.png` })

    // Close modal without executing deletion
    await page.click('button:has-text("Cancel")')
    await page.waitForSelector('div[role="dialog"]', { state: "detached", timeout: 5000 })

    const deleteModalPassed = modalVisible && initialDisabled && wrongDisabled && correctEnabled
    results.push({
      test: 3,
      name: "DELETE ACCOUNT CONFIRMATION MODAL",
      result: deleteModalPassed ? "PASS" : "FAIL",
      details: deleteModalPassed ? "Modal correctly blocked deletion until valid confirmation text 'DELETE' was entered." : "Delete confirmation modal behavior failed.",
    })

    // ----------------------------------------------------
    // STEP 4: Test Sign Out Flow
    // ----------------------------------------------------
    console.log("\n[STEP 4] Testing Sign Out from Profile page...")
    // Click Sign Out button inside Danger Zone
    const signOutBtn = page.locator('.border-destructive\\/30 button:has-text("Sign Out")').first()
    await signOutBtn.click()

    await page.waitForURL("**/login**", { timeout: 10000 })
    const loginPageVisible = (await page.locator('button[type="submit"]').isVisible()) || page.url().includes("/login")
    console.log(`[STEP 4] Redirected to login page: ${loginPageVisible} (URL: ${page.url()})`)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/profile_sign_out.png` })
    results.push({
      test: 4,
      name: "SIGN OUT FROM PROFILE",
      result: loginPageVisible ? "PASS" : "FAIL",
      details: loginPageVisible ? "Signed out successfully and redirected to login." : "Sign out redirection failed.",
    })

  } catch (err) {
    console.error("FATAL PROFILE E2E ERROR:", err)
  } finally {
    await browser.close()
    console.log("\n=== PROFILE E2E TEST RESULTS SUMMARY ===")
    console.table(results)
    const allPassed = results.length === 4 && results.every((r) => r.result === "PASS")
    fs.writeFileSync(
      path.join(__dirname, "../e2e-profile-results.json"),
      JSON.stringify(results, null, 2)
    )
    if (!allPassed) {
      process.exitCode = 1
    }
  }
}

runProfilePageTests()
