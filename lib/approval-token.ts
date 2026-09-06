import crypto from "crypto"

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "blazion-approval-secret-key"

export interface ApprovalPayload {
  responseId: string
  formId: string
  stage: number
  approverEmail: string
  action: "approve" | "reject"
  exp: number
}

export function createApprovalToken(payload: Omit<ApprovalPayload, "exp">): string {
  const fullPayload: ApprovalPayload = {
    ...payload,
    exp: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days
  }
  const json = JSON.stringify(fullPayload)
  const b64 = Buffer.from(json).toString("base64url")
  const hmac = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url")
  return `${b64}.${hmac}`
}

export function verifyApprovalToken(token: string): ApprovalPayload | null {
  try {
    const [b64, signature] = token.split(".")
    if (!b64 || !signature) return null

    const expectedSig = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url")
    if (signature !== expectedSig) return null

    const json = Buffer.from(b64, "base64url").toString("utf-8")
    const payload = JSON.parse(json) as ApprovalPayload

    if (payload.exp && Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}
