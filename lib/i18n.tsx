"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"

export type Language = "en" | "hi"

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
] as const

export const translations = {
  en: {
    // Builder & General
    app_title: "FormSetu",
    audit_form: "Audit My Form",
    auditing: "Auditing Form...",
    share_form: "Share",
    settings: "Settings",
    preview: "Preview",
    publish: "Publish",
    unpublish: "Unpublish",
    published: "Published",
    draft: "Draft",
    save_draft: "Save Draft",
    saved: "Saved",
    saving: "Saving...",
    add_question: "Add Question",
    delete_question: "Delete Question",
    duplicate: "Duplicate",
    required: "Required",
    optional: "Optional",
    question_title: "Question Title",
    question_description: "Help text or description",
    options: "Options",
    add_option: "Add Option",
    option_placeholder: "Option",
    theme_studio: "Theme Studio",
    version_history: "Version History",
    templates: "Templates",

    // Public Form Fill
    enter_answer: "Enter your answer...",
    type_or_speak: "Type your answer or click mic to speak...",
    listening: "Listening...",
    clear: "Clear",
    undo: "Undo",
    sign_here: "Draw your signature above",
    phone_placeholder: "98765 43210",
    phone_invalid: "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)",
    date_placeholder: "DD-MM-YYYY",
    select_option: "Select an option",
    select_slot: "Select an appointment slot",
    slot_locked_for: "Slot held for 5 minutes",
    next: "Next",
    previous: "Previous",
    submit: "Submit",
    submitting: "Submitting...",
    thank_you: "Thank you!",
    response_recorded: "Your response has been successfully recorded.",
    view_certificate: "Download Certificate (PDF)",
    generating_report: "Generating personalized insights with AI...",
    ai_persona_insights: "Personalized AI Insights",
    offline_banner: "Offline mode — your responses are saved locally and will auto-sync when online.",
    synced_online: "Connection restored! Answers synced successfully.",
    conversational_press_enter: "Press Enter ↵ to continue",
    progress: "Progress",

    // Actions & Feedback
    copy_link: "Copy Link",
    link_copied: "Link copied to clipboard!",
    qr_code: "QR Code",
    embed_code: "Embed Code",
    download_qr: "Download QR",
    export_csv: "Export CSV",
    filter_flagged: "Flagged Spam",
    all_responses: "All Responses",
  },
  hi: {
    // Builder & General
    app_title: "फॉर्मसेतु",
    audit_form: "फॉर्म ऑडिट करें (AI)",
    auditing: "फॉर्म की जांच हो रही है...",
    share_form: "शेयर करें",
    settings: "सेटिंग्स",
    preview: "पूर्वावलोकन",
    publish: "प्रकाशित करें",
    unpublish: "अप्रकाशित करें",
    published: "प्रकाशित",
    draft: "ड्राफ्ट",
    save_draft: "ड्राफ्ट सहेजें",
    saved: "सहेजा गया",
    saving: "सहेज रहे हैं...",
    add_question: "नया प्रश्न जोड़ें",
    delete_question: "प्रश्न हटाएं",
    duplicate: "प्रतिलिपि बनाएं",
    required: "अनिवार्य",
    optional: "वैकल्पिक",
    question_title: "प्रश्न का शीर्षक",
    question_description: "सहायक विवरण या निर्देश",
    options: "विकल्प",
    add_option: "विकल्प जोड़ें",
    option_placeholder: "विकल्प",
    theme_studio: "थीम स्टूडियो",
    version_history: "संस्करण इतिहास",
    templates: "टेम्प्लेट्स",

    // Public Form Fill
    enter_answer: "अपना उत्तर यहाँ लिखें...",
    type_or_speak: "उत्तर टाइप करें या बोलने के लिए माइक दबाएं...",
    listening: "सुन रहे हैं...",
    clear: "साफ़ करें",
    undo: "पूर्ववत करें",
    sign_here: "कृपया ऊपर हस्ताक्षर करें",
    phone_placeholder: "98765 43210",
    phone_invalid: "कृपया 10 अंकों का वैध भारतीय मोबाइल नंबर दर्ज करें (उदा. 9876543210)",
    date_placeholder: "DD-MM-YYYY (दिन-माह-वर्ष)",
    select_option: "एक विकल्प चुनें",
    select_slot: "अपॉइंटमेंट स्लॉट चुनें",
    slot_locked_for: "स्लॉट 5 मिनट के लिए आरक्षित है",
    next: "आगे बढ़ें",
    previous: "पीछे जाएं",
    submit: "जमा करें",
    submitting: "जमा हो रहा है...",
    thank_you: "धन्यवाद!",
    response_recorded: "आपकी प्रतिक्रिया सफलतापूर्वक दर्ज कर ली गई है।",
    view_certificate: "प्रमाणपत्र डाउनलोड करें (PDF)",
    generating_report: "AI द्वारा व्यक्तिगत रिपोर्ट तैयार की जा रही है...",
    ai_persona_insights: "व्यक्तिगत AI रिपोर्ट",
    offline_banner: "ऑफ़लाइन मोड — आपके उत्तर सुरक्षित हैं और इंटरनेट आने पर स्वचालित सिंक होंगे।",
    synced_online: "इंटरनेट जुड़ गया! उत्तर सिंक हो गए हैं।",
    conversational_press_enter: "आगे बढ़ने के लिए Enter ↵ दबाएं",
    progress: "प्रगति",

    // Actions & Feedback
    copy_link: "लिंक कॉपी करें",
    link_copied: "लिंक कॉपी हो गया!",
    qr_code: "क्यूआर कोड (QR Code)",
    embed_code: "एम्बेड कोड",
    download_qr: "क्यूआर डाउनलोड करें",
    export_csv: "CSV डाउनलोड करें",
    filter_flagged: "संदिग्ध स्पैम",
    all_responses: "सभी प्रतिक्रियाएं",
  },
}

type TranslationKey = keyof typeof translations.en

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey, fallback?: string) => string
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => translations.en[key] || key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  useEffect(() => {
    try {
      const saved = localStorage.getItem("formsetu_lang") as Language
      if (saved === "en" || saved === "hi") {
        setLanguageState(saved)
        return
      }
      const navLang = navigator.language?.toLowerCase() || ""
      if (navLang.startsWith("hi")) {
        setLanguageState("hi")
      }
    } catch {
      // Fallback
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem("formsetu_lang", lang)
    } catch {}
  }

  const t = (key: TranslationKey, fallback?: string): string => {
    const dict = translations[language] || translations.en
    return dict[key] || fallback || translations.en[key] || key
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}

export const useLanguage = useTranslation


export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useTranslation()
  return (
    <div className={`inline-flex items-center rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-0.5 shadow-sm text-xs font-medium ${className || ""}`}>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`px-2.5 py-1 rounded-md transition-all ${
          language === "en"
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLanguage("hi")}
        className={`px-2.5 py-1 rounded-md transition-all ${
          language === "hi"
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs font-semibold"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
        }`}
      >
        हिन्दी
      </button>
    </div>
  )
}
