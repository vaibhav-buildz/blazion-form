import { z } from "zod"

export const orgProfileSchema = z.object({
  logo_url: z
    .string()
    .url({ message: "Please enter a valid URL." })
    .optional()
    .or(z.literal("")),
  org_name: z.string().min(1, { message: "Organisation name is required." }),
  org_type: z.enum([
    "School/College",
    "Company",
    "NGO",
    "Government",
    "Hospital",
    "Other",
  ]),
  tagline: z.string().max(100, { message: "Tagline cannot exceed 100 characters." }).optional(),
  primary_color: z.string().default("#4A5D23"),
  accent_color: z.string().default("#A9B388"),
  website_url: z
    .string()
    .url({ message: "Please enter a valid URL." })
    .optional()
    .or(z.literal("")),
  contact_email: z
    .string()
    .email({ message: "Please enter a valid email address." })
    .optional()
    .or(z.literal("")),
})

export type OrgProfileInput = z.infer<typeof orgProfileSchema>
