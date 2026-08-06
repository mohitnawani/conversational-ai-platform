import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { loginSchema, type LoginFormValues } from '@/lib/validators'
import { useAppDispatch, useAppSelector } from '@/store'
import { login } from '@/store/authSlice'
import { AuthShell } from '@/components/auth/AuthShell'
import {
  ErrorAlert,
  Field,
  FormCard,
  PasswordInput,
  SubmitButton,
} from '@/components/auth/Form'
import { inputClass } from '@/components/auth/inputStyles'

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
    <AuthShell>
      <FormCard>
        <header className="space-y-2">
          <p className="font-mono text-eyebrow uppercase text-primary">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
            Welcome back
          </p>
          <h1 className="font-display text-heading font-semibold text-base-content">
            Sign in to your memory
          </h1>
          <p className="text-body text-base-content/60">
            Every person, fact, and thread you saved is waiting.
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
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

        <p className="mt-7 text-center text-body text-base-content/60">
          New to Mnemo?{' '}
          <Link
            to="/register"
            className="group inline-flex items-center gap-1 font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary/80 hover:decoration-primary/70"
          >
            Create your workspace
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </p>
      </FormCard>
    </AuthShell>
  )
}

