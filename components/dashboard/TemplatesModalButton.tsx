"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  LayoutTemplate,
  Briefcase,
  Stethoscope,
  GraduationCap,
  MessageSquare,
  FileCheck2,
  ArrowRight,
  Loader2,
  Sparkles,
  HeartHandshake,
  PartyPopper,
  Building2,
  Home,
  Car,
  Dumbbell,
} from "lucide-react"

interface TemplateDef {
  id: string
  title: string
  category: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  questions: Array<{
    title: string
    type: string
    required: boolean
    options?: string[]
    settings?: Record<string, any>
  }>
  settings?: Record<string, any>
}

const TEMPLATES: TemplateDef[] = [
  {
    id: "job-app",
    title: "Startup Job Application",
    category: "Hiring & HR",
    description: "Screen candidates with Indian phone validation, current & expected CTC, notice period, and resume upload.",
    icon: Briefcase,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    settings: {
      collect_email: true,
      email_verification_mode: "otp",
    },
    questions: [
      { title: "Full Legal Name", type: "short_text", required: true },
      { title: "Contact Phone Number", type: "phone", required: true },
      { title: "LinkedIn or Portfolio Profile", type: "short_text", required: true },
      {
        title: "Years of Professional Experience",
        type: "dropdown",
        required: true,
        options: ["Fresher (0 years)", "1-3 years", "3-5 years", "5+ years"],
      },
      {
        title: "Notice Period",
        type: "multiple_choice",
        required: true,
        options: ["Immediate (< 15 days)", "30 Days", "60 Days", "90 Days"],
      },
      { title: "Upload Resume (PDF / DOCX)", type: "file_upload", required: true },
    ],
  },
  {
    id: "clinic-booking",
    title: "Clinic & Doctor Slot Booking",
    category: "Healthcare",
    description: "Book appointments with date & time slots, primary symptoms, and optional prescription uploads.",
    icon: Stethoscope,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    settings: {
      collect_email: true,
    },
    questions: [
      { title: "Patient Full Name", type: "short_text", required: true },
      { title: "Patient Age & Gender", type: "short_text", required: true },
      { title: "Emergency Contact Phone", type: "phone", required: true },
      { title: "Select Appointment Date & Time", type: "slot_booking", required: true },
      { title: "Describe Symptoms & Chief Complaint", type: "long_text", required: true },
      { title: "Attach Existing Medical Reports or Prescription", type: "file_upload", required: false },
    ],
  },
  {
    id: "hackathon-reg",
    title: "National Hackathon Registration",
    category: "Campus & Events",
    description: "Register student teams, capture university credentials, and collect honor code e-signatures.",
    icon: GraduationCap,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    settings: {
      enable_certificates: true,
    },
    questions: [
      { title: "Team Leader Full Name", type: "short_text", required: true },
      { title: "College / University Name", type: "short_text", required: true },
      { title: "Student Roll / ID Number", type: "short_text", required: true },
      { title: "WhatsApp Contact Number", type: "phone", required: true },
      {
        title: "Preferred Track / Domain",
        type: "multiple_choice",
        required: true,
        options: ["AI & Machine Learning", "FinTech & Payments", "Web3 & Security", "HealthTech & Social Impact"],
      },
      {
        title: "Team Size",
        type: "dropdown",
        required: true,
        options: ["Solo (1 Member)", "Duo (2 Members)", "Trio (3 Members)", "Squad (4 Members)"],
      },
      { title: "Sign the Hackathon Code of Conduct", type: "signature", required: true },
    ],
  },
  {
    id: "customer-feedback",
    title: "Customer NPS & Product Feedback",
    category: "Customer Success",
    description: "Collect user satisfaction ratings, voice feedback dictation, and actionable product suggestions.",
    icon: MessageSquare,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    settings: {},
    questions: [
      {
        title: "How likely are you to recommend us to a colleague? (1 to 10)",
        type: "dropdown",
        required: true,
        options: ["10 - Extremely likely", "9", "8", "7", "6", "5", "4", "3", "2", "1 - Not at all likely"],
      },
      { title: "What feature do you love most?", type: "short_text", required: false },
      { title: "What is one thing we could do better? (Feel free to use voice mic)", type: "long_text", required: false },
      { title: "Your Email Address (optional for follow up)", type: "short_text", required: false },
    ],
  },
  {
    id: "kyc-compliance",
    title: "Vendor KYC & Identity Verification",
    category: "Legal & Finance",
    description: "Gather business PAN/GSTIN, authorized signatory phone, identity documents, and formal e-signature.",
    icon: FileCheck2,
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    settings: {
      enable_certificates: true,
      email_verification_mode: "otp",
    },
    questions: [
      { title: "Legal Entity or Full Name", type: "short_text", required: true },
      { title: "PAN or GSTIN Number", type: "short_text", required: true },
      { title: "Authorized Signatory Mobile Number", type: "phone", required: true },
      { title: "Official Registered Address", type: "long_text", required: true },
      { title: "Upload PAN / Aadhaar / Incorporation Certificate", type: "file_upload", required: true },
      { title: "Authorized Signatory E-Signature", type: "signature", required: true },
    ],
  },
  {
    id: "school-admission",
    title: "School & College Admission Form",
    category: "Education",
    description: "Enroll students with parent details, Indian phone verification, previous academic records, and birth certificate.",
    icon: GraduationCap,
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    settings: {
      collect_email: true,
      email_verification_mode: "otp",
      enable_certificates: true,
    },
    questions: [
      { title: "Student Full Name", type: "short_text", required: true },
      { title: "Date of Birth", type: "short_text", required: true },
      { title: "Grade / Standard Applying For", type: "dropdown", required: true, options: ["Primary (Grade 1-5)", "Middle (Grade 6-8)", "Secondary (Grade 9-10)", "Senior Secondary (Grade 11-12)"] },
      { title: "Father / Mother / Guardian Full Name", type: "short_text", required: true },
      { title: "Guardian Mobile Number", type: "phone", required: true },
      { title: "Residential Address (with PIN Code)", type: "long_text", required: true },
      { title: "Upload Birth Certificate or Previous Marksheet (PDF)", type: "file_upload", required: true },
    ],
  },
  {
    id: "ngo-survey",
    title: "NGO Volunteer & Community Survey",
    category: "Non-Profit & Social",
    description: "Onboard grassroots volunteers across Indian districts, capture availability slots, and gather field experience.",
    icon: HeartHandshake,
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    settings: {},
    questions: [
      { title: "Volunteer Full Name", type: "short_text", required: true },
      { title: "Mobile Phone (+91)", type: "phone", required: true },
      { title: "Current City / District", type: "short_text", required: true },
      {
        title: "Area of Interest",
        type: "checkbox",
        required: true,
        options: ["Child Education", "Rural Healthcare", "Disaster Relief", "Environmental Cleanliness", "Women Empowerment"],
      },
      {
        title: "Weekly Time Commitment",
        type: "dropdown",
        required: true,
        options: ["2-4 hours/week", "5-10 hours/week", "Full-time volunteer"],
      },
      { title: "Why do you want to join our mission? (Voice input welcome)", type: "long_text", required: false },
    ],
  },
  {
    id: "wedding-rsvp",
    title: "Indian Wedding RSVP & Accommodation",
    category: "Events & Hospitality",
    description: "Manage guest counts, dietary preferences (Pure Veg / Jain / Non-Veg), and travel/arrival dates.",
    icon: PartyPopper,
    color: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
    settings: {},
    questions: [
      { title: "Guest / Family Head Name", type: "short_text", required: true },
      { title: "WhatsApp Number for Itinerary Updates", type: "phone", required: true },
      {
        title: "Total Family Members Attending",
        type: "dropdown",
        required: true,
        options: ["1 Person", "2 People", "3-4 Family Members", "5+ Members"],
      },
      {
        title: "Dietary Preference",
        type: "multiple_choice",
        required: true,
        options: ["Vegetarian", "Jain (No Onion/Garlic)", "Non-Vegetarian"],
      },
      {
        title: "Do you require Hotel / Guest House Accommodation?",
        type: "multiple_choice",
        required: true,
        options: ["Yes, please arrange", "No, arranging own stay"],
      },
      { title: "Expected Arrival Date & Flight/Train Details", type: "long_text", required: false },
    ],
  },
  {
    id: "society-grievance",
    title: "Society Maintenance & Resident Grievance",
    category: "Community & Housing",
    description: "Log apartment complaints (plumbing, electrical, security), upload issue photos, and track resolution.",
    icon: Building2,
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    settings: {
      collect_email: true,
    },
    questions: [
      { title: "Resident Full Name", type: "short_text", required: true },
      { title: "Flat / Tower / Villa Number", type: "short_text", required: true },
      { title: "Resident Contact Phone", type: "phone", required: true },
      {
        title: "Category of Complaint",
        type: "dropdown",
        required: true,
        options: ["Water / Plumbing Issue", "Power / Lift Maintenance", "Parking Dispute", "Security / Guard Alert", "Common Area Cleanliness"],
      },
      { title: "Describe the Issue in Detail", type: "long_text", required: true },
      { title: "Upload Photo of Problem / Damage", type: "file_upload", required: false },
    ],
  },
  {
    id: "tenant-verification",
    title: "Property Rental & Tenant Police Verification",
    category: "Real Estate",
    description: "Collect prospective tenant identification, permanent address, employer details, and verification e-signature.",
    icon: Home,
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    settings: {
      collect_email: true,
      email_verification_mode: "otp",
      enable_certificates: true,
    },
    questions: [
      { title: "Tenant Legal Full Name", type: "short_text", required: true },
      { title: "Mobile Phone (+91)", type: "phone", required: true },
      { title: "Permanent Hometown Address", type: "long_text", required: true },
      { title: "Current Employer & Office Location", type: "short_text", required: true },
      { title: "Aadhaar / Voter ID Number", type: "short_text", required: true },
      { title: "Upload Government ID (Aadhaar / Passport / Driving License)", type: "file_upload", required: true },
      { title: "Tenant E-Signature for Verification Consent", type: "signature", required: true },
    ],
  },
  {
    id: "driving-rto",
    title: "Driving School & RTO License Registration",
    category: "Services",
    description: "Sign up for motor driving lessons, choose 2-wheeler/4-wheeler training slots, and upload learner documents.",
    icon: Car,
    color: "bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20",
    settings: {},
    questions: [
      { title: "Applicant Name", type: "short_text", required: true },
      { title: "Mobile Phone (+91)", type: "phone", required: true },
      {
        title: "Vehicle Class Training",
        type: "dropdown",
        required: true,
        options: ["Four Wheeler (Car - Manual)", "Four Wheeler (Car - Automatic)", "Two Wheeler (Motorcycle with Gear)", "Both 2 & 4 Wheeler Combo"],
      },
      { title: "Select Preferred Daily Slot", type: "slot_booking", required: true },
      { title: "Upload Age Proof / ID (PAN / Aadhaar)", type: "file_upload", required: true },
    ],
  },
  {
    id: "yoga-fitness",
    title: "Yoga & Fitness Studio Class Membership",
    category: "Health & Wellness",
    description: "Register gym and yoga practitioners, schedule batch timing slots, and capture medical history disclaimer.",
    icon: Dumbbell,
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    settings: {
      enable_certificates: true,
    },
    questions: [
      { title: "Member Full Name", type: "short_text", required: true },
      { title: "Contact Phone (+91)", type: "phone", required: true },
      {
        title: "Batch & Timing Slot",
        type: "dropdown",
        required: true,
        options: ["Morning 6:00 AM - 7:00 AM", "Morning 7:30 AM - 8:30 AM", "Evening 6:00 PM - 7:00 PM", "Weekend Special Batch"],
      },
      { title: "Do you have any existing injury or medical condition?", type: "long_text", required: false },
      { title: "Sign the Health & Fitness Disclaimer", type: "signature", required: true },
    ],
  },
  {
    id: "coaching-scholarship",
    title: "Coaching Institute Scholarship Exam",
    category: "Education",
    description: "Register students for JEE/NEET/Foundation talent tests, choose exam test centers, and collect hall tickets.",
    icon: GraduationCap,
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    settings: {
      collect_email: true,
      enable_certificates: true,
    },
    questions: [
      { title: "Student Name", type: "short_text", required: true },
      { title: "Parent Contact Mobile (+91)", type: "phone", required: true },
      {
        title: "Target Examination",
        type: "multiple_choice",
        required: true,
        options: ["IIT-JEE (Advanced)", "NEET (Medical)", "Olympiad / NTSE", "Commerce & CA Foundation"],
      },
      { title: "Current School & Percentage/Grade", type: "short_text", required: true },
      { title: "Preferred Offline Test City / Center", type: "dropdown", required: true, options: ["Delhi NCR", "Kota", "Bengaluru", "Hyderabad", "Mumbai", "Pune", "Online Home Proctoring"] },
    ],
  },
]

export function TemplatesModalButton() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [creatingId, setCreatingId] = React.useState<string | null>(null)

  const handleUseTemplate = async (template: TemplateDef) => {
    setCreatingId(template.id)
    try {
      const res = await fetch("/api/forms/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: template.title,
          description: template.description,
          questions: template.questions,
          settings: template.settings || {},
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create form from template")
      }
      setOpen(false)
      router.push(`/dashboard/forms/${data.formId}/edit`)
    } catch (err: any) {
      alert(err.message || "Failed to create form")
      setCreatingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-sm">
          <LayoutTemplate className="w-4 h-4 text-indigo-600" />
          <span>Templates</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Form Templates Library</DialogTitle>
              <DialogDescription className="text-xs">
                Jumpstart your workflow with pre-configured questions, validation, and e-signatures.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
          {TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon
            const isSelected = creatingId === tmpl.id
            return (
              <Card
                key={tmpl.id}
                className="p-5 border-border hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-4 hover:shadow-md"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl border ${tmpl.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      {tmpl.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base text-foreground">{tmpl.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>

                  <div className="pt-2 text-xs text-muted-foreground flex flex-wrap gap-1.5">
                    {tmpl.questions.slice(0, 3).map((q, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-muted/60 text-[11px] border border-border/50"
                      >
                        {q.title}
                      </span>
                    ))}
                    {tmpl.questions.length > 3 && (
                      <span className="text-[11px] text-muted-foreground self-center">
                        +{tmpl.questions.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <Button
                    onClick={() => handleUseTemplate(tmpl)}
                    disabled={Boolean(creatingId)}
                    className="w-full justify-between text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isSelected ? (
                      <>
                        <span>Setting up form...</span>
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </>
                    ) : (
                      <>
                        <span>Use this template ({tmpl.questions.length} fields)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
