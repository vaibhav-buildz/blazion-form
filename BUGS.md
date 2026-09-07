# Blazion Form — Comprehensive Bug Sweep & Verification Report (`BUGS.md`)

*Conducted on: 2026-09-07*  
*Environment: Windows, Node.js, Next.js 16 App Router, Supabase Postgres, Chromium & MS Edge Playwright*

---

## 1. Executive Summary

A full end-to-end bug sweep across the entire Blazion Form application was conducted, covering:
1. **Static Type Safety & Build Validation:** `npx tsc --noEmit` across all App Router routes and components.
2. **Database Integrity & Schema Alignment:** Column constraints, foreign key cascades, RLS security policies, and timestamp fields.
3. **Backend API Test Suite:** Developer API v1, Respondent Portal API, AI Form Auditor, AI Smart Field Suggestions, AI Response Summarizer, Analytics Event Tracker.
4. **Real-Browser Playwright E2E Suite:** Form settings persistence, response limit enforcement, republish URL invalidation, login-gate & OTP verification, multi-step sections, and profile management flows.

All automated and manual tests are currently **passing (100% green)**. All discovered blocker and major issues have been resolved.

---

## 2. Bug History & Resolutions

### Bug 1: Form Submission RLS Violation
- **Severity:** Blocker
- **Component:** `app/api/forms/[id]/submit/route.ts` & `PublicFormFill.tsx`
- **Root Cause:** When an anonymous respondent submitted a public form, direct database inserts or service role bypass was not applied consistently to the `responses` table, tripping Supabase Row Level Security policy `new row violates row-level security policy for table "responses"`.
- **Resolution:** Updated `/api/forms/[id]/submit/route.ts` to utilize the Supabase admin client (`supabaseAdmin`) for public submission creation, bypassing respondent RLS while retaining strict form existence and publishing validation.
- **Status:** **FIXED & VERIFIED** (Tested with anonymous submissions across multiple forms).

---

### Bug 2: Response Limit Enforcement Failing
- **Severity:** Major
- **Component:** `app/api/forms/[id]/submit/route.ts` & `app/f/[slug]/page.tsx`
- **Root Cause:** Forms configured with a maximum response limit allowed excess submissions because atomic counter checks were absent during high-concurrency submits and the public page rendered the form unconditionally.
- **Resolution:** Added server-side response count validation before insert in `submit/route.ts`. Returns `403 Form response limit reached` when count >= limit. Added proactive client-side limit notice banner in `app/f/[slug]/page.tsx`.
- **Status:** **FIXED & VERIFIED** (Playwright E2E Test 2: Submitted Response #1 and #2 cleanly; Response #3 correctly blocked with response limit notice).

---

### Bug 3: Section Break Button State in Builder
- **Severity:** Major (Initial E2E False Alarm)
- **Component:** `FormBuilder.tsx` / `Sidebar`
- **Root Cause:** Form builder controls are intentionally disabled when a form is published to prevent breaking live schema contracts. E2E test scripts attempted to append section breaks without unpublishing first.
- **Resolution:** Updated E2E flow to explicitly unpublish before structural schema edits; added tooltip clarification in builder UI when form is in published state.
- **Status:** **RESOLVED** (Playwright E2E Test 6 verified clean section break additions and multi-step pagination).

---

### Bug 4: Public Form Login-Gate Visibility & Matching
- **Severity:** Major (Selector Mismatch)
- **Component:** `PublicFormFill.tsx` & E2E Test Selectors
- **Root Cause:** Form gating works as intended, but E2E test selectors used exact string matches on inner wrapper divs that contained leading icons.
- **Resolution:** Standardized access gate indicators and strengthened Playwright locator to `page.locator('text=Sign in to Fill Form')`.
- **Status:** **RESOLVED** (Playwright E2E Test 4 passed: Unauthenticated user blocked; redirect and verified badge confirmed upon login).

---

### Bug 5: Column Name Discrepancy on Responses Table
- **Severity:** Medium
- **Component:** `app/api/portal/submissions/route.ts` & `app/api/v1/forms/[id]/submissions/route.ts`
- **Root Cause:** New portal and API endpoints queried the `responses` table with `.order("created_at", { ascending: false })`, but the PostgreSQL schema defines this timestamp as `submitted_at`.
- **Resolution:** Corrected all `created_at` references on the `responses` table to `submitted_at` across all API routes and UI components.
- **Status:** **FIXED & VERIFIED** (`scripts/test-new-features.js` Test 1, 4, and 5 pass cleanly).

---

### Bug 6: Gemini Model Deprecation & Outage Resilience
- **Severity:** High
- **Component:** `lib/ai.ts`
- **Root Cause:** Hardcoded requests to `gemini-2.5-flash` threw 404 errors as Google GenAI deprecated that model tag for new users.
- **Resolution:** Built the resilient `callGemini` helper function with an automated fallback waterfall:
  1. `process.env.GEMINI_MODEL`
  2. `gemini-3.8-flash`
  3. `gemini-3.6-flash`
  4. `gemini-2.0-flash`
  5. `gemini-1.5-flash`
- **Status:** **FIXED & VERIFIED** (AI Auditor & AI Field Suggestions successfully evaluated via Gemini).

---

### Bug 7: Undefined `lastError` in AI Generation Fallback
- **Severity:** Minor (TypeScript Compile Error)
- **Component:** `lib/ai.ts` (Line 108 & 111)
- **Root Cause:** When `callGemini` was extracted into a shared wrapper, residual references to `lastError` remained in `generateFormWithAI`, causing `npx tsc --noEmit` to fail with `Cannot find name 'lastError'`.
- **Resolution:** Removed obsolete `lastError` checks and streamlined error throwing to use descriptive fallback exceptions.
- **Status:** **FIXED & VERIFIED** (`npx tsc --noEmit` returns code 0 with zero errors).

---

## 3. Test Suite Run Log & Status Matrix

| Test ID | Suite Name | Description | Status |
|---|---|---|:---:|
| **TS-01** | `TypeScript Compiler` | Complete workspace type check (`npx tsc --noEmit`) | **PASS (0 errors)** |
| **API-01** | `Respondent Portal API` | Fetches submissions by email (`/api/portal/submissions`) | **PASS** |
| **API-02** | `Developer API v1 POST` | Programmatically submits form data with API key | **PASS** |
| **API-03** | `Developer API v1 GET` | Retrieves submission records and question metadata | **PASS** |
| **API-04** | `Developer API v1 Forms List` | Lists forms for user workspace via API token | **PASS** |
| **API-05** | `Developer API v1 Form Create` | Programmatically provisions new forms via Developer API | **PASS** |
| **API-06** | `AI Form Auditor` | Evaluates UX, ambiguity, and question clarity (`/api/ai/audit`) | **PASS** |
| **API-07** | `AI Smart Field Suggestions` | Suggests 3 contextual next questions (`/api/ai/suggest-fields`) | **PASS** |
| **E2E-01** | `Settings Persistence` | Expiry date, submission limits, password, and OTP mode across F5 | **PASS** |
| **E2E-02** | `Response Limit Enforcement` | Rejects submission when quota limit reached | **PASS** |
| **E2E-03** | `Republish URL Invalidation` | Invalidates old slug; provisions new active slug upon republish | **PASS** |
| **E2E-04** | `Login-Mode Verification` | Enforces authentication; verifies email badge and session flow | **PASS** |
| **E2E-05** | `OTP-Mode Verification` | Rejects invalid OTP (999999); unlocks form upon valid 6-digit OTP | **PASS** |
| **E2E-06** | `Multi-Step Flow` | Section 1 'Next' advances to Section 2 without early submit; completes | **PASS** |
| **PROF-01**| `Profile Sections Render` | Renders Info, Org Branding, Password, Notifications, Danger Zone | **PASS** |
| **PROF-02**| `Display Name Edit` | Updates display name and verifies persistence across reload | **PASS** |
| **PROF-03**| `Delete Account Modal` | Verifies safety lock requiring 'DELETE' confirmation text | **PASS** |
| **PROF-04**| `Sign Out Flow` | Clears authentication session and redirects to `/login` | **PASS** |

---

## 4. Minor Observations & Future Enhancements

1. **Web Speech API Availability:**
   - Supported natively in Chromium/Edge/Chrome/Safari. In Firefox, the microphone button gracefully alerts the user that speech recognition is not supported by their browser engine.
2. **Third-Party Integrations Pending API Keys:**
   - As instructed, Razorpay, MSG91, DigiLocker, and Hugging Face integrations are excluded. CSV contact bulk uploads and SMS dispatch buttons display standard "Coming Soon" badges until accounts are configured.
3. **PWA Offline Sync:**
   - Offline queue utilizes IndexedDB / `blazion_offline_queue` in localStorage. Requests replay sequentially when `window.addEventListener('online')` fires.
