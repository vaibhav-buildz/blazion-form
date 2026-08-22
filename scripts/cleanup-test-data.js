const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const envText = fs.readFileSync('.env.local', 'utf-8')
const env = {}
envText.split('\n').forEach((line) => {
  const parts = line.split('=')
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim()
  }
})

const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanup() {
  console.log('=== E2E CLEANUP ANALYSIS & EXECUTION ===\n')

  // 1. Find test user
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
  const testUser = usersData?.users?.find(
    (u) => u.email === 'e2e-test@example.com'
  )

  console.log('1. Test User Pending Confirmation:')
  if (testUser) {
    console.log(`   - ID: ${testUser.id}`)
    console.log(`   - Email: ${testUser.email}`)
    console.log(`   - Created: ${testUser.created_at}`)
  } else {
    console.log('   - No test user e2e-test@example.com found.')
  }

  // 2. Find test forms to delete
  let testUserFormIds = []
  if (testUser) {
    const { data: userForms } = await supabaseAdmin
      .from('forms')
      .select('id, title, slug, created_at')
      .eq('user_id', testUser.id)
    testUserFormIds = userForms || []
  }

  const { data: titleForms } = await supabaseAdmin
    .from('forms')
    .select('id, title, slug, created_at')
    .or('title.ilike.%Republished Title%,title.ilike.%Untitled Form%')

  const allFormsToDeleteMap = new Map()
  ;(testUserFormIds || []).forEach((f) => allFormsToDeleteMap.set(f.id, f))
  ;(titleForms || []).forEach((f) => allFormsToDeleteMap.set(f.id, f))

  const formsToDelete = Array.from(allFormsToDeleteMap.values())
  console.log(`\n2. Deleted ${formsToDelete.length} Test Forms:`)
  if (formsToDelete.length > 0) {
    formsToDelete.forEach((f) => {
      console.log(
        `   - [Form ID: ${f.id}] Title: "${f.title}", Slug: ${f.slug}, Created: ${f.created_at}`
      )
    })

    const ids = formsToDelete.map((f) => f.id)
    await supabaseAdmin.from('questions').delete().in('form_id', ids)
    await supabaseAdmin.from('responses').delete().in('form_id', ids)
    await supabaseAdmin.from('email_otp_verifications').delete().in('form_id', ids)
    const { error: formDelErr } = await supabaseAdmin
      .from('forms')
      .delete()
      .in('id', ids)
    if (formDelErr) console.error('   Error deleting forms:', formDelErr.message)
    else console.log('   -> Successfully deleted test forms, questions, responses, & OTP entries.')
  } else {
    console.log('   - No test forms found to delete.')
  }

  // 3. Clean up older email_otp_verifications (older than today)
  const todayIso = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'
  const { data: oldOtps } = await supabaseAdmin
    .from('email_otp_verifications')
    .select('id, email, created_at')
    .lt('created_at', todayIso)

  console.log(`\n3. Checked OTP Verifications older than today (${todayIso}):`)
  if (oldOtps && oldOtps.length > 0) {
    console.log(`   - Found ${oldOtps.length} older OTP records:`)
    oldOtps.forEach((o) =>
      console.log(`     - [OTP ID: ${o.id}] Email: ${o.email}, Created: ${o.created_at}`)
    )
    await supabaseAdmin
      .from('email_otp_verifications')
      .delete()
      .lt('created_at', todayIso)
    console.log('   -> Successfully deleted older OTP rows.')
  } else {
    console.log('   - No older OTP verification rows found.')
  }
}

cleanup()
