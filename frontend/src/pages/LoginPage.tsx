import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { loginSchema, type LoginFormValues } from '@/lib/validators'
import { useAppDispatch, useAppSelector } from '@/store'
import { login } from '@/store/authSlice'
import { AuthShell, AuthStage } from '@/components/auth/AuthShell'
import {
  ErrorAlert,
  Field,
  PasswordInput,
  SubmitButton,
} from '@/components/auth/Form'
import { inputClass } from '@/components/auth/inputStyles'

const CITATION_CHIPS = [
  { label: 'research_paper.pdf · p.12', ref: '1', left: '4%', delay: 0, duration: 12 },
  { label: 'quarterly_report.pdf · p.4', ref: '2', left: '34%', delay: 3.5, duration: 13 },
  { label: 'lecture_notes.pdf · p.2', ref: '3', left: '62%', delay: 6.5, duration: 11 },
  { label: 'transcript.mp4 · 00:14:32', ref: '4', left: '18%', delay: 8.5, duration: 14 },
]

export function LoginPage() {
  const dispatch = useAppDispatch()
  const { status, error } = useAppSelector((s) => s.auth)
  const loading = status === 'loading'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  function onSubmit(values: LoginFormValues) {
    dispatch(login(values))
  }

  return (
    <AuthShell
      stage={
        <AuthStage
          kicker="The index thread"
          headline={
            <>
              Every answer,{' '}
              <em className="font-normal not-italic text-amber-index">traceable.</em>
            </>
          }
          tagline="Each reply is bound to the passage it came from — pull the card, see the source."
          chips={CITATION_CHIPS}
          foot="INDEX: 04 SOURCES · ALL ROOTED"
        />
      }
    >
      <div className="stagger">
        <header>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-amber-index">
            Sign in
          </p>
          <h1 className="mt-3 font-display text-[32px] font-medium leading-[1.15] tracking-tight text-paper-100">
            Pick up where you left off.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-paper-500">
            Your threads, your citations — still bound to their sources.
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Field id="email" label="Email" error={errors.email?.message}>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={inputClass(!!errors.email)}
              {...register('email')}
            />
          </Field>

          <Field id="password" label="Password" error={errors.password?.message}>
            <PasswordInput
              id="password"
              placeholder="Your password"
              autoComplete="current-password"
              invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
          </Field>

          {error ? <ErrorAlert message={error} /> : null}

          <SubmitButton loading={loading} label="Sign in" loadingLabel="Signing in…" />
        </form>

        <p className="mt-7 text-center text-sm text-paper-500">
          No account?{' '}
          <Link
            to="/register"
            className="group inline-flex items-center gap-1 font-medium text-amber-index transition-colors duration-150 hover:text-amber-index-deep"
          >
            Sign up
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}