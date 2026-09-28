"use client"

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { Language, TranslationKey, translations } from './i18n'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: (key: TranslationKey, fallback?: string) => string
  isRtl: boolean
  dir: 'ltr'
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = 'hepatiq.language'

export function LanguageProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      document.cookie = `${STORAGE_KEY}=en; path=/; max-age=0`
      if (typeof document !== 'undefined') {
        document.documentElement.dir = 'ltr'
        document.documentElement.lang = 'en'
      }
    } catch {
      // ignore
    }
  }, [])

  const setLanguage = () => {}
  const toggleLanguage = () => {}

  const t = (key: TranslationKey, fallback?: string): string => {
    const dict = translations.en
    return dict[key] ?? fallback ?? key
  }

  return (
    <LanguageContext.Provider
      value={{
        language: 'en',
        setLanguage,
        toggleLanguage,
        t,
        isRtl: false,
        dir: 'ltr',
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}