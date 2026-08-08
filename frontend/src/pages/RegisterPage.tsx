import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { registerSchema, type RegisterFormValues } from '@/lib/validators'
import { useAppDispatch, useAppSelector } from '@/store'
import { register as registerUser } from '@/store/authSlice'
import { AuthShell, AuthStage } from '@/components/auth/AuthShell'
import {
  ErrorAlert,
  Field,
  PasswordInput,
  PasswordMeter,
  SubmitButton,
} from '@/components/auth/Form'
import { inputClass } from '@/components/auth/inputStyles'

const UPLOAD_CHIPS = [
  { label: '+ lecture_notes.pdf', left: '4%', delay: 0, duration: 12, upload: true },
  { label: '+ transcript.mp4', left: '40%', delay: 4, duration: 13, upload: true },
  { label: '+ quarterly_report.pdf', left: '12%', delay: 7, duration: 14, upload: true },
  { label: '+ paper_arxiv.pdf', left: '58%', delay: 9, duration: 11, upload: true },
]

export function RegisterPage() {
  const dispatch = useAppDispatch()
  const { status, error } = useAppSelector((s) => s.auth)
  const loading = status === 'loading'

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      Firstname: '',
      Lastname: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const password = watch('password')

  function onSubmit(values: RegisterFormValues) {
    dispatch(
      registerUser({
        name: `${values.Firstname.trim()} ${values.Lastname.trim()}`.trim(),
        email: values.email,
        password: values.password,
      }),
    )
  }

  return (
    <AuthShell
      stage={
        <AuthStage
          kicker="The index thread"
          headline={
            <>
              Bring your own{' '}
              <em className="font-normal not-italic text-amber-index">sources.</em>
            </>
          }
          tagline="Upload what you know — every answer stays bound to the passages it came from."
          chips={UPLOAD_CHIPS}
          foot="INGEST: PDF · MP4 · MD · CSV"
        >
          <p className="mt-6 max-w-sm font-mono text-[0.7rem] leading-relaxed tracking-[0.04em] text-paper-500">
            DOCS ARE CHUNKED → EMBEDDED → INDEXED
            <br />
            THEN CITABLE BY PAGE, PARAGRAPH, OR TIMESTAMP
          </p>
        </AuthStage>
      }
    >
      <div className="stagger">
        <header>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-amber-index">
            Sign up
          </p>
          <h1 className="mt-3 font-display text-[32px] font-medium leading-[1.15] tracking-tight text-paper-100">
            Start an indexed workspace.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-paper-500">
            Name it, drop in sources, and ask anything — citations included.
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field id="Firstname" label="First name" error={errors.Firstname?.message}>
              <input
                id="Firstname"
                type="text"
                placeholder="Alex"
                autoComplete="given-name"
                aria-invalid={!!errors.Firstname}
                aria-describedby={errors.Firstname ? 'Firstname-error' : undefined}
                className={inputClass(!!errors.Firstname)}
                {...register('Firstname')}
              />
            </Field>
            <Field id="Lastname" label="Last name" error={errors.Lastname?.message}>
              <input
                id="Lastname"
                type="text"
                placeholder="Rivera"
                autoComplete="family-name"
                aria-invalid={!!errors.Lastname}
                aria-describedby={errors.Lastname ? 'Lastname-error' : undefined}
                className={inputClass(!!errors.Lastname)}
                {...register('Lastname')}
              />
            </Field>
          </div>

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

          <Field
            id="password"
            label="Password"
            hint="8-24 chars · a-z · A-Z · 0-9 · symbol"
            error={errors.password?.message}
          >
            <PasswordInput
              id="password"
              placeholder="Choose a password"
              autoComplete="new-password"
              invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            <PasswordMeter value={password ?? ''} />
          </Field>

          <Field id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
            <PasswordInput
              id="confirmPassword"
              placeholder="Repeat it once more"
              autoComplete="new-password"
              invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              {...register('confirmPassword')}
            />
          </Field>

          {error ? <ErrorAlert message={error} /> : null}

          <SubmitButton loading={loading} label="Create workspace" loadingLabel="Creating…" />
        </form>

        <p className="mt-7 text-center text-sm text-paper-500">
          Already have a workspace?{' '}
          <Link
            to="/login"
            className="group inline-flex items-center gap-1 font-medium text-amber-index transition-colors duration-150 hover:text-amber-index-deep"
          >
            Sign in
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}