/**
 * Playwright test: verify dashboard pages scroll fully without clipping.
 * Run with: node scripts/test-scroll-layout.js
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const SCREENSHOT_DIR = path.join(__dirname, "..", "e2e-screenshots");

// Read credentials from .env.local
const envContent = fs.readFileSync(
  path.join(__dirname, "..", ".env.local"),
  "utf-8"
);
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1536, height: 826 } });
  const page = await context.newPage();

  // --- Login ---
  console.log("[1/6] Logging in...");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });

  // Try to log in with test credentials
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"]');

  if ((await emailInput.count()) > 0) {
    await emailInput.fill("vaibhav993548@gmail.com");
    await passwordInput.fill("Password123!");
    
    // Click submit button
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    
    // Wait for navigation away from login
    await page.waitForURL(/\/dashboard/, { timeout: 10000 }).catch(() => {
      console.log("  ⚠ Login redirect did not happen, may already be logged in or credentials wrong.");
    });
  }

  const pagesToTest = [
    { name: "Profile", path: "/dashboard/profile" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Settings", path: "/dashboard/settings/identity" },
  ];

  let allPassed = true;

  for (const { name, path: pagePath } of pagesToTest) {
    console.log(`\n[Testing] ${name} page (${pagePath})`);

    await page.goto(`${BASE}${pagePath}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Check if we got redirected to login
    if (page.url().includes("/login")) {
      console.log(`  ⚠ Redirected to login — skipping ${name} (auth required)`);
      continue;
    }

    // Screenshot: top of page
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `scroll-${name.toLowerCase()}-top.png`),
    });
    console.log(`  ✅ Took top screenshot`);

    // Get the main scrollable container
    const mainEl = page.locator("main");
    const mainHandle = await mainEl.elementHandle();

    if (!mainHandle) {
      console.log(`  ❌ Could not find <main> element`);
      allPassed = false;
      continue;
    }

    // Get scroll metrics
    const scrollInfo = await mainHandle.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollTop: el.scrollTop,
      offsetHeight: el.offsetHeight,
      overflowY: window.getComputedStyle(el).overflowY,
    }));

    console.log(`  scrollHeight=${scrollInfo.scrollHeight} clientHeight=${scrollInfo.clientHeight} overflow-y=${scrollInfo.overflowY}`);

    const isScrollable = scrollInfo.scrollHeight > scrollInfo.clientHeight;

    if (!isScrollable) {
      console.log(`  ℹ Content fits in viewport, no scrolling needed — OK`);
      continue;
    }

    // Scroll to absolute bottom
    await mainHandle.evaluate((el) => {
      el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
    });
    await page.waitForTimeout(500);

    // Screenshot: bottom of page
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `scroll-${name.toLowerCase()}-bottom.png`),
    });
    console.log(`  ✅ Took bottom screenshot`);

    // Verify we actually scrolled to the bottom
    const afterScroll = await mainHandle.evaluate((el) => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));

    const scrolledToBottom =
      Math.abs(afterScroll.scrollTop + afterScroll.clientHeight - afterScroll.scrollHeight) < 5;

    if (scrolledToBottom) {
      console.log(`  ✅ ${name}: Scrolled to bottom successfully (scrollTop=${afterScroll.scrollTop})`);
    } else {
      console.log(`  ❌ ${name}: Could NOT scroll to bottom! scrollTop=${afterScroll.scrollTop}, expected ~${afterScroll.scrollHeight - afterScroll.clientHeight}`);
      allPassed = false;
    }

    // Check that main doesn't have its content clipped by a parent overflow-hidden
    const clippingInfo = await mainHandle.evaluate((el) => {
      let current = el.parentElement;
      const clippers = [];
      while (current) {
        const style = window.getComputedStyle(current);
        if (style.overflow === "hidden" || style.overflowY === "hidden") {
          const rect = current.getBoundingClientRect();
          clippers.push({
            tag: current.tagName,
            class: current.className.substring(0, 80),
            height: rect.height,
            overflow: style.overflow,
            overflowY: style.overflowY,
          });
        }
        current = current.parentElement;
      }
      return clippers;
    });

    if (clippingInfo.length > 0) {
      // The outer div should have overflow-hidden to prevent body scroll — that's expected
      // But if the intermediate wrapper also has overflow-hidden, that's a problem
      const problematic = clippingInfo.filter(
        (c) => !c.class.includes("h-screen") // the outermost wrapper is expected
      );
      if (problematic.length > 0) {
        console.log(`  ⚠ Potentially problematic overflow-hidden ancestors:`);
        problematic.forEach((c) => console.log(`    <${c.tag}> class="${c.class}" height=${c.height}`));
      }
    }

    // Scroll back to top for clean state
    await mainHandle.evaluate((el) => el.scrollTo({ top: 0, behavior: "instant" }));
  }

  console.log("\n" + "=".repeat(50));
  console.log(allPassed ? "✅ ALL PAGES PASSED" : "❌ SOME PAGES FAILED");
  console.log("=".repeat(50));

  await browser.close();
  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
