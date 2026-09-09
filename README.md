# FormSetu

> **India-First, AI-Powered Next-Gen Form Builder**  
> Build, audit, publish, and analyze smart forms with AI assistance, regional localization, seamless respondent portals, and developer-friendly APIs.

🔗 **Live Demo:** [https://formsetu-tau.vercel.app/](https://formsetu-tau.vercel.app/)

---

## 🌟 Overview

**FormSetu** is an India-first, AI-powered form builder designed to empower users, businesses, and creators with intelligent form generation, seamless multi-mode form filling (Standard, Sectioned Multi-Step, and Conversational), real-time response analytics, and automated submission workflows.

Infused with a rich **Saffron & Sandstone** aesthetic, FormSetu combines modern UX design with powerful serverless architecture backed by Next.js, Supabase, and Google Gemini AI.

---

## ✨ Features & Architecture Highlights

### 🚀 Phase 1–4 Completed Features
- **🤖 AI-Powered Form Engine (Gemini AI)**:
  - Natural Language Form Generation (prompt to full form schema).
  - AI Form Auditor (evaluates clarity, accessibility, and completion probability).
  - AI Smart Field Suggestions (context-aware question recommendations).
  - AI Response Summarization & Sentiment Analysis.
- **🎨 Interactive Builder & Flexible Layouts**:
  - Drag & Drop Builder (`@dnd-kit`).
  - 3 Viewing Modes: Standard Single-Page, Multi-Step Sectioned with progress bars, and Conversational Card view.
  - Custom Form Slugs (`/f/my-custom-slug`) and QR Code generation.
- **🛡️ Access Control & Response Verification**:
  - Password-Protected Forms.
  - Login Gate (Authenticated-only submissions).
  - Response Limits & Expiration Timers.
  - OTP Email Verification via Resend.
- **📊 Analytics & Respondent Portal**:
  - Real-time Analytics Dashboard powered by Recharts (submissions, drop-off rates, conversion metrics).
  - Respondent Portal: Allows respondents to track, view, and export past submissions.
  - Automated PDF Certificate & Receipt Generation (`jspdf`).
  - Signature Pad & File Upload fields.
- **🔌 Developer API & Integration Hooks**:
  - Developer API v1 (`/api/v1/forms/[id]/submissions`) with custom API Key authentication.
  - Custom Webhooks support for form submit events.
  - CSV/JSON Export (`papaparse`).

### ⏳ Pending Integration (Requires External API Keys/Accounts)
- **Razorpay**: Direct INR Payment Gateway integration.
- **MSG91**: Indian SMS & WhatsApp OTP Gateway.
- **DigiLocker**: Identity & Official Document Verification.
- **Hugging Face**: Custom open-source NLP model fallbacks.

---

## 🎨 Design Theme

FormSetu features a signature **Saffron & Sandstone** visual design system:
- **Warm Saffron (`#E0561B` / `#D97706`) & Terracotta accents**.
- **Sandstone glassmorphic cards** with sleek light/dark mode support.
- Modern typography via Google Fonts (Inter / Outfit).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & Vanilla CSS with Radix UI components
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with RLS & Service Role Admin bypass)
- **AI Integration**: [Google GenAI / Gemini 3.6 & 3.8 Flash](https://ai.google.dev/)
- **Animations & Icons**: [Framer Motion](https://www.framer.com/motion/) & [Lucide React](https://lucide.dev/)
- **PDF & Canvas**: `jspdf`, `react-signature-canvas`, `canvas-confetti`
- **Analytics**: `recharts`

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- Supabase Account & Project
- Google Gemini API Key

### Environment Setup

Create a `.env.local` file in the root directory with the following environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.6-flash

RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation & Development Server

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/formsetu.git
   cd formsetu
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Quality Assurance

FormSetu includes static type verification, API integration tests, and Playwright E2E browser automation:

```bash
# Typecheck
npx tsc --noEmit

# Run E2E Test Suite
node scripts/run-e2e-tests.js

# Run New Features API & Portal Test Suite
node scripts/test-new-features.js

# Run Brand Rename Verification
node scripts/test-rename-formsetu.js
```

---

## 📄 License

This project is licensed under the MIT License.
