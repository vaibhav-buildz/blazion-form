# FormSetu — Comprehensive Bug Sweep & Verification Report (`BUGS.md`)

*Conducted on: 2026-09-07*  
*Environment: Windows, Node.js, Next.js 16 App Router, Supabase Postgres, Chromium & MS Edge Playwright*

---

## 1. Executive Summary

A full end-to-end bug sweep across the entire FormSetu application was conducted, covering:
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

### Bug 8: Missing Password Gate UI in Public Form
- **Severity:** Major (Functional Incompleteness)
- **Component:** `components/form-builder/PublicFormFill.tsx`
- **Root Cause:** While `/api/forms/[id]/verify-password` was implemented with bcrypt verification and state variables (`isPasswordVerified`, `passwordInput`) were defined, the password entry card and unlock flow were never rendered, allowing password-protected forms to either show questions directly or misalign with gates.
- **Resolution:** Rendered the dedicated password unlock card with error messaging and `Loader2` spinner. Wrapped downstream email/OTP gates and question forms inside `isPasswordVerified`.
- **Status:** **FIXED & VERIFIED** (Playwright E2E Test 1 & helper tests verify password unlock).

---

### Bug 9: Smart Field Suggestions API 404
- **Severity:** Major (Endpoint Discrepancy)
- **Component:** `components/form-builder/FormBuilder.tsx` (Line 626)
- **Root Cause:** When a user clicked a suggested field chip from Gemini, `FormBuilder.tsx` attempted to POST to `/api/forms/${form.id}/questions`, which returned a 404 because the correct questions route is `/api/questions/create`.
- **Resolution:** Updated the POST target to `/api/questions/create` with `form_id`, `type`, `title`, `position`, and options.
- **Status:** **FIXED & VERIFIED** (Smart field suggestions now successfully persist to database).

---

### Bug 10: Forgot Password Email Redirect to Non-Existent Route
- **Severity:** Major (Auth Recovery Broken)
- **Component:** `app/(auth)/forgot-password/page.tsx`
- **Root Cause:** `resetPasswordForEmail` specified `redirectTo: ${origin}/auth/reset-password`, but the reset password page is located at `/reset-password` and requires passing through the auth callback session handler (`/auth/callback?next=/reset-password`).
- **Resolution:** Corrected `redirectTo` to `${origin}/auth/callback?next=/reset-password` so password reset magic links properly establish the recovery session.
- **Status:** **FIXED & VERIFIED**.

---

### Bug 11: Section Break Allowed as Conditional Logic Rule Target
- **Severity:** Medium (Builder Logic Inconsistency)
- **Component:** `components/form-builder/QuestionSettings.tsx`
- **Root Cause:** `priorQuestions` in `QuestionSettings.tsx` did not filter out section breaks, allowing users to configure conditions dependent on a section break (which has no respondent answer).
- **Resolution:** Added `q.type !== "section_break"` filter to `priorQuestions` dropdown options.
- **Status:** **FIXED & VERIFIED**.

---

### Bug 12: Native `alert(...)` and `confirm(...)` across Builder & Dashboard
- **Severity:** Minor / UX Polish
- **Component:** `FormCard.tsx`, `CreateFormButton.tsx`, `TemplatesModalButton.tsx`, `FormSettingsDialog.tsx`, `ResponsesView.tsx`, `VersionHistoryModal.tsx`
- **Root Cause:** Browser-native blocking popups (`alert()` and `confirm()`) broke the premium UX and disrupted automated testing.
- **Resolution:** Replaced all native dialogs with inline status banners, toasts, and accessible confirm triggers.
- **Status:** **FIXED & VERIFIED**.

---

### Bug 13: Hardcoded US Date Formats (`en-US`) in Submission Route & FormCard
- **Severity:** Minor / Localization
- **Component:** `components/dashboard/FormCard.tsx` & `app/api/forms/[id]/submit/route.ts`
- **Root Cause:** Dates were formatted using `new Date().toLocaleDateString("en-US")` instead of the mandated Indian standard (`DD-MM-YYYY`).
- **Resolution:** Converted all date displays to use `formatDateDDMMYYYY` and `formatDateTimeDDMMYYYY`.
- **Status:** **FIXED & VERIFIED**.

---

### Bug 14: Mobile Sidebar & 3-Column FormBuilder Clipping
- **Severity:** Major (Responsive Layout Defect)
- **Component:** `app/(dashboard)/layout.tsx` & `components/form-builder/FormBuilder.tsx`
- **Root Cause:** On 375px and 768px viewports, the fixed 240px dashboard sidebar crushed dashboard content into 119px width. Similarly, the 3-column form builder layout crushed the central canvas when sidebar columns remained fixed width.
- **Resolution:**
  - Added a mobile overlay drawer with hamburger toggle in `app/(dashboard)/layout.tsx`.
  - Added a segmented view switcher (`[Fields | Canvas | Inspector]`) in `FormBuilder.tsx` on screens `< lg`, allowing seamless single-column mobile operation without horizontal scrolling or clipping.
- **Status:** **FIXED & VERIFIED** (Tested across 375px, 768px, and 1440px).

---

### Bug 15: Color System Non-Compliance in Builder Modals & Portal
- **Severity:** Minor / Theme Studio Polish
- **Component:** `ThemeStudioModal.tsx`, `SharePanelModal.tsx`, `VersionHistoryModal.tsx`, `TeamWorkspaceModal.tsx`, `app/portal/page.tsx`
- **Root Cause:** Components contained leftover hardcoded Tailwind classes (`slate-*`, `purple-*`, `pink-*`, `indigo-*`) rather than Saffron & Sandstone design system tokens.
- **Resolution:** Migrated all modal backgrounds, borders, badges, buttons, and icons to semantic tokens (`bg-primary`, `text-primary`, `border-border`, `bg-card`, `bg-muted`).
- **Status:** **FIXED & VERIFIED**.

---

### Bug 16: Public Form Dynamic Route Caching of Response Limit / Expiry
- **Severity:** Major (Edge Case Stale State)
- **Component:** `app/f/[slug]/page.tsx`
- **Root Cause:** Next.js App Router cached the rendered output of `/f/[slug]` when `export const dynamic = "force-dynamic"` was missing, causing subsequent responses to receive stale "Form Closed" HTML.
- **Resolution:** Added `export const dynamic = "force-dynamic"` to `app/f/[slug]/page.tsx`.
- **Status:** **FIXED & VERIFIED** (Playwright Test 2 submits responses in real-time).

---

### Bug 17: SSR Hydration Mismatch on Offline Indicator
- **Severity:** Minor / Console Warning
- **Component:** `components/form-builder/PublicFormFill.tsx` (Line 519)
- **Root Cause:** `isOnline` initialized directly from `navigator.onLine` during SSR/hydration, causing React hydration mismatch warning when browser status differed from SSR default.
- **Resolution:** Initialized `isOnline` to `true` and synchronized via `useEffect` on client mount.
- **Status:** **FIXED & VERIFIED** (Console errors: 0).

---

### Bug 18: Card Title Non-Clickable in Dashboard
- **Severity:** Minor / UX Polish
- **Component:** `components/dashboard/FormCard.tsx`
- **Root Cause:** The form card title was rendered as plain text inside `CardTitle`, requiring users to find the small "Edit" button in the footer.
- **Resolution:** Wrapped `formTitle` in an accessible Next.js `Link` to `/dashboard/forms/${form.id}/edit`.
- **Status:** **FIXED & VERIFIED**.

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
   - Offline queue utilizes IndexedDB / `formsetu_offline_queue` in localStorage. Requests replay sequentially when `window.addEventListener('online')` fires.
