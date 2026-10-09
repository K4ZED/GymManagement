import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import id, { type Dict } from './id'
import en from './en'
import { ApiError } from '@/api/http'

export type Lang = 'id' | 'en'
export type TKey = keyof Dict

const dicts: Record<Lang, Dict> = { id, en }
const locales: Record<Lang, string> = { id: 'id-ID', en: 'en-US' }
const STORAGE_KEY = 'gym.lang'

interface I18nValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TKey, vars?: Record<string, string | number>) => string
  /** Pesan error yang ramah pengguna dari ApiError / Error apa pun */
  tError: (err: unknown) => string
  money: (n: number) => string
  date: (iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => string
  time: (iso: string) => string
  num: (n: number) => string
}

const I18nContext = createContext<I18nValue | null>(null)

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'id' || saved === 'en') return saved
  } catch {
    /* ignore */
  }
  return navigator.language?.startsWith('en') ? 'en' : 'id'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<I18nValue>(() => {
    const dict = dicts[lang]
    const locale = locales[lang]
    const t: I18nValue['t'] = (key, vars) => {
      let s = dict[key] ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
      return s
    }
    const moneyFmt = new Intl.NumberFormat(locale, { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
    const numFmt = new Intl.NumberFormat(locale)
    return {
      lang,
      setLang,
      t,
      tError: (err) => {
        if (err instanceof ApiError) {
          const key = `errors.${err.code}` as TKey
          const base = key in dict ? dict[key] : err.message || dict['errors.generic']
          // Detail per-field dari VALIDATION_ERROR
          const details = err.details?.map((d) => `${d.path}: ${d.message}`).join('; ')
          return details ? `${base}. ${details}` : base
        }
        return dict['errors.generic']
      },
      money: (n) => moneyFmt.format(n),
      num: (n) => numFmt.format(n),
      date: (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
        iso ? new Intl.DateTimeFormat(locale, opts).format(new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)) : '-',
      time: (iso) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)),
    }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
