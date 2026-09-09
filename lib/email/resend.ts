import { Resend } from "resend"

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY || "re_dummy_key_for_build"
  return new Resend(apiKey)
}

export const resend = new Proxy({} as Resend, {
  get(_target, prop, receiver) {
    const client = getResendClient() as any
    const value = client[prop]
    if (typeof value === "function") {
      return value.bind(client)
    }
    return value
  },
})

