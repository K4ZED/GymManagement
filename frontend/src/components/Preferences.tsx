import { Moon, Sun } from 'lucide-react'
import clsx from 'clsx'
import { useI18n, type Lang } from '@/i18n'
import { useTheme } from '@/lib/theme'
import { IconButton } from './ui'

/** Tombol ganti bahasa ID/EN + tema terang/gelap */
export function Preferences({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const { lang, setLang, t } = useI18n()
  return (
    <div className={clsx('flex items-center gap-1', className)}>
      <div role="group" aria-label={t('lang.switch')} className="flex text-xs">
        {(['id', 'en'] as Lang[]).map((l, i) => (
          <span key={l} className="flex items-center">
            {i > 0 && <span className="text-border">/</span>}
            <button
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={clsx('px-1.5 py-1 uppercase transition', lang === l ? 'font-semibold text-text underline underline-offset-4' : 'text-muted hover:text-text')}
            >
              {l}
            </button>
          </span>
        ))}
      </div>
      <IconButton label={theme === 'dark' ? t('theme.light') : t('theme.dark')} onClick={toggle}>
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </IconButton>
    </div>
  )
}
