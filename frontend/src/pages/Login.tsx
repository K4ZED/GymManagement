import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { homeFor, useAuth } from '@/lib/auth'
import { useI18n } from '@/i18n'
import type { Role } from '@/types'
import { Button, Field, FormError, Input } from '@/components/ui'
import { Preferences } from '@/components/Preferences'
import { Logo } from '@/layouts/AdminLayout'

// Akun seed dari backend (lihat API_CONTRACT.md) — hanya ditampilkan saat development
const demoAccounts: { role: Role; email: string }[] = [
  { role: 'ADMIN', email: 'admin@gym.test' },
  { role: 'STAFF', email: 'staff@gym.test' },
  { role: 'TRAINER', email: 'trainer@gym.test' },
  { role: 'MEMBER', email: 'member@gym.test' },
]

export default function LoginPage() {
  const { t, tError } = useI18n()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(email, password)
      navigate(homeFor(user.role), { replace: true })
    } catch (err) {
      setError(tError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel tipografis, tanpa gradien/ilustrasi */}
      <div className="hidden flex-col justify-between bg-ink p-10 text-ink-fg lg:flex">
        <span className="display text-lg">{t('app.name')}</span>
        <div>
          <p className="display text-[7.5rem] leading-[0.85]">
            {t('auth.panelLine1')}
            <br />
            {t('auth.panelLine2')}
            <br />
            <span className="text-primary">{t('auth.panelLine3')}</span>
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
            <div className="mt-8 space-y-4">
              <Field label={t('auth.email')}>
                {(id) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
              </Field>
              <Field label={t('auth.password')}>
                {(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
              </Field>
              <FormError message={error} />
              <Button type="submit" size="lg" className="w-full" loading={submitting}>
                {t('auth.login')}
              </Button>
            </div>

            {import.meta.env.DEV && (
              <div className="mt-10 border-t pt-4">
                <p className="eyebrow mb-2">{t('auth.demo')}</p>
                <ul className="divide-y text-sm">
                  {demoAccounts.map((a) => (
                    <li key={a.email}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-2 text-left hover:text-primary"
                        onClick={() => {
                          setEmail(a.email)
                          setPassword('password123')
                        }}
                      >
                        <span className="font-mono text-xs">{a.email}</span>
                        <span className="eyebrow">{t(`role.${a.role}`)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
