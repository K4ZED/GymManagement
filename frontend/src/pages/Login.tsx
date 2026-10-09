import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { homeFor, useAuth } from '@/lib/auth'
import { useI18n } from '@/i18n'
import type { Role } from '@/types'
import { Button, Field, FormError, Input } from '@/components/ui'
import { Preferences } from '@/components/Preferences'
import { Logo } from '@/layouts/AdminLayout'

// Akun seed dari backend (lihat API_CONTRACT.md). Tombol masuk cepat tampil kecuali VITE_DEMO_LOGIN=false
const SHOW_DEMO = import.meta.env.VITE_DEMO_LOGIN !== 'false'
const DEMO_PASSWORD = 'password123'
const demoAccounts: { role: Role; email: string }[] = [
  { role: 'ADMIN', email: 'admin@gym.test' },
  { role: 'STAFF', email: 'staff@gym.test' },
  { role: 'TRAINER', email: 'trainer@gym.test' },
  { role: 'MEMBER', email: 'member@gym.test' },
]

export default function LoginPage() {
  const { t, tError, date } = useI18n()
  const now = new Date().toISOString()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState<string | null>(null) // email yang sedang diproses

  async function signIn(mail: string, pass: string) {
    setError('')
    setSubmitting(mail)
    try {
      const user = await login(mail, pass)
      navigate(homeFor(user.role), { replace: true })
    } catch (err) {
      setError(tError(err))
    } finally {
      setSubmitting(null)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void signIn(email, password)
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel tipografis, tanpa gradien/ilustrasi */}
      <div className="hidden flex-col justify-between bg-ink p-10 text-ink-fg lg:flex">
        <span className="display text-lg">{t('app.name')}</span>
        <div>
          <p className="display text-[7.5rem] leading-[0.85]">
            {date(now, { weekday: 'long' })}
            <br />
            <span className="text-primary">{date(now, { day: 'numeric', month: 'long' })}</span>
          </p>
          <p className="mt-8 max-w-sm text-sm opacity-70">{t('auth.panelNote')}</p>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex h-14 items-center justify-between px-4 sm:px-8">
          <span className="lg:invisible">
            <Logo />
          </span>
          <Preferences />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <form onSubmit={onSubmit} className="w-full max-w-sm">
            <h1 className="display text-5xl">{t('auth.title')}</h1>
            <p className="mt-2 text-sm text-muted">{t('auth.subtitle')}</p>

            {SHOW_DEMO && (
              <div className="mt-8">
                <p className="eyebrow mb-2">{t('auth.quickLogin')}</p>
                <div className="grid grid-cols-2 border-t border-l">
                  {demoAccounts.map((a) => (
                    <button
                      key={a.email}
                      type="button"
                      disabled={!!submitting}
                      onClick={() => signIn(a.email, DEMO_PASSWORD)}
                      className="group flex flex-col items-start border-r border-b bg-surface px-3 py-3 text-left transition hover:bg-ink hover:text-ink-fg disabled:opacity-60"
                    >
                      <span className="display flex items-center gap-2 text-2xl">
                        {t(`role.${a.role}`)}
                        {submitting === a.email && <Loader2 size={16} className="animate-spin" />}
                      </span>
                      <span className="font-mono text-[11px] text-muted group-hover:text-ink-fg/70">{a.email}</span>
                    </button>
                  ))}
                </div>
                <p className="eyebrow mt-8">{t('auth.orManual')}</p>
              </div>
            )}

            <div className={SHOW_DEMO ? 'mt-3 space-y-4' : 'mt-8 space-y-4'}>
              <Field label={t('auth.email')}>
                {(id) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
              </Field>
              <Field label={t('auth.password')}>
                {(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
              </Field>
              <FormError message={error} />
              <Button type="submit" size="lg" className="w-full" loading={submitting === email && !!email} disabled={!!submitting}>
                {t('auth.login')}
              </Button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
