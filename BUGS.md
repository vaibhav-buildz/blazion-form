# Bug Sweep Checklist & Findings

## Bugs Found

1. **Form Submission RLS Violation (Blocker)**
   - **Page/Component:** `app/api/forms/[id]/submit/route.ts` & `PublicFormFill.tsx`
   - **Description:** When an anonymous user submits a public form, the Supabase insert fails with `new row violates row-level security policy for table "responses"`. This prevents any public form submissions.
   - **Steps to Reproduce:** Create a form, publish it, open the public link in an incognito window (or logged out), fill the form, and click submit. An error banner appears below the submit button.
   - **Severity:** Blocker (FIXED in `app/api/forms/[id]/submit/route.ts`)

2. **Response Limit Enforcement Failing (Major)**
   - **Page/Component:** `app/api/forms/[id]/submit/route.ts` or `PublicFormFill.tsx`
   - **Description:** A form set to a maximum of 2 responses is allowing a 3rd response to be submitted successfully. The enforcement logic is either missing or not firing correctly.
   - **Steps to Reproduce:** Create a form, set max responses to 2 in Settings, publish, and submit 3 times. The 3rd time succeeds instead of showing a limit reached notice.
   - **Severity:** Major (FIXED in `app/api/forms/[id]/submit/route.ts` & `app/f/[slug]/page.tsx`)

3. **Section Break Button Disabled (Major)**
   - **Page/Component:** `FormBuilder.tsx` or `Sidebar` components
   - **Description:** The "Section Break" button in the form builder sidebar is disabled, preventing users from creating multi-step forms.
   - **Steps to Reproduce:** Open the form builder, try to click the "Section Break" button in the fields palette. It is disabled.
   - **Severity:** Major (FALSE ALARM: The E2E test forgot to unpublish the form before trying to add a section break. Fixed the E2E script.)

4. **Login Mode Gate Not Visible (Major)**
   - **Page/Component:** `PublicFormFill.tsx`
   - **Description:** When a form requires Login to submit, the login gate isn't showing up properly for logged-out users, or the session handling in the public form is flawed.
   - **Steps to Reproduce:** Set form to require Login. Visit the public URL as an unauthenticated user. The form might still be visible or bypass the gate.
   - **Severity:** Major (FALSE ALARM: The E2E test script was checking for the wrong text inside an anchor tag. Fixed the E2E script.)
