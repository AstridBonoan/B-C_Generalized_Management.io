import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BrandLockup, BrandLogo } from '../components/BrandLogo'
import { Alert, Button, Field, Input } from '../components/ui'
import { useApp } from '../context/AppContext'
import { collectErrors, isEmail, isNonEmpty } from '../lib/validation'

export function LoginPage() {
  const { store, refresh } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const errors = collectErrors([isEmail(email), isNonEmpty(password, 'Password')])
    if (errors.length) {
      setError(errors[0])
      return
    }
    setLoading(true)
    setError(null)
    try {
      await store.login(email, password)
      refresh()
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="brand-panel hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandLogo variant="onDark" className="h-20 w-auto max-w-xs object-contain object-left" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">B&C Software & Web</p>
          <h1 className="mt-3 font-display text-4xl leading-tight lg:text-5xl">General Management System</h1>
          <p className="mt-4 max-w-md text-slate-300">
            Modern digital solutions for growing businesses. A reusable operations foundation for clients, work,
            scheduling, and administration.
          </p>
        </div>
        <p className="text-sm text-slate-400">Use your B&C account email and password to continue.</p>
      </div>
      <div className="flex items-center justify-center bg-paper p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-card p-8 shadow-sm">
          <div className="lg:hidden">
            <BrandLockup />
          </div>
          <h2 className="font-display text-3xl">Sign in</h2>
          <p className="text-sm text-ink-soft">Use your B&C account to continue.</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Field label="Email">
            <Input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <Link className="block text-sm text-teal underline" to="/forgot-password">
            Forgot password
          </Link>
        </form>
      </div>
    </div>
  )
}
