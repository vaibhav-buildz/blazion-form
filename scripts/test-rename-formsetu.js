const { chromium } = require("playwright")

const BASE_URL = "http://localhost:3000"

async function testFormSetuRename() {
  console.log("=== STARTING PLAYWRIGHT FORMSETU RENAME VERIFICATION ===")
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const results = []

  try {
    // 1. Login Page
    console.log("\n[TEST 1] Checking Login Page...")
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
    const loginHtml = await page.content()
    const loginHasFormSetu = loginHtml.includes("FormSetu") || (await page.title()).includes("FormSetu")
    const loginHasBlazion = /blazion/i.test(loginHtml)
    results.push({
      page: "Login Page (/login)",
      title: await page.title(),
      hasFormSetu: loginHasFormSetu,
      hasBlazion: loginHasBlazion,
      passed: !loginHasBlazion,
    })

    // 2. Signup Page
    console.log("\n[TEST 2] Checking Signup Page...")
    await page.goto(`${BASE_URL}/signup`, { waitUntil: "networkidle" })
    const signupHtml = await page.content()
    const signupHasFormSetu = signupHtml.includes("FormSetu")
    const signupHasBlazion = /blazion/i.test(signupHtml)
    results.push({
      page: "Signup Page (/signup)",
      title: await page.title(),
      hasFormSetu: signupHasFormSetu,
      hasBlazion: signupHasBlazion,
      passed: signupHasFormSetu && !signupHasBlazion,
    })

    // 3. Dashboard Page
    console.log("\n[TEST 3] Checking Dashboard Layout & Header...")
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" })
    const dashHtml = await page.content()
    const dashHasFormSetu = dashHtml.includes("FormSetu")
    const dashHasBlazion = /blazion/i.test(dashHtml)
    results.push({
      page: "Dashboard (/dashboard)",
      title: await page.title(),
      hasFormSetu: dashHasFormSetu,
      hasBlazion: dashHasBlazion,
      passed: dashHasFormSetu && !dashHasBlazion,
    })

    // 4. Portal Page
    console.log("\n[TEST 4] Checking Portal Page...")
    await page.goto(`${BASE_URL}/portal`, { waitUntil: "networkidle" })
    const portalHtml = await page.content()
    const portalHasFormSetu = portalHtml.includes("FormSetu")
    const portalHasBlazion = /blazion/i.test(portalHtml)
    results.push({
      page: "Portal (/portal)",
      title: await page.title(),
      hasFormSetu: portalHasFormSetu,
      hasBlazion: portalHasBlazion,
      passed: portalHasFormSetu && !portalHasBlazion,
    })

    console.log("\n=== TEST RESULTS SUMMARY ===")
    console.table(results)

    const allPassed = results.every((r) => r.passed)
    if (allPassed) {
      console.log("\n✅ ALL TESTS PASSED: 'FormSetu' rendered correctly, 0 'Blazion' text found!")
    } else {
      console.error("\n❌ TEST FAILED: Found leftover 'Blazion' or missing 'FormSetu'")
      process.exit(1)
    }
  } catch (err) {
    console.error("Test execution error:", err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

testFormSetuRename()
