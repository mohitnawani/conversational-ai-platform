import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { registerSchema, type RegisterFormValues } from '@/lib/validators'
import { useAppDispatch, useAppSelector } from '@/store'
import { register as registerUser } from '@/store/authSlice'
import { AuthShell } from '@/components/auth/AuthShell'
import {
  ErrorAlert,
  Field,
  FormCard,
  PasswordInput,
  SubmitButton,
} from '@/components/auth/Form'
import { inputClass } from '@/components/auth/inputStyles'

export function RegisterPage() {
  const dispatch = useAppDispatch()
  const { status, error } = useAppSelector((s) => s.auth)
  const loading = status === 'loading'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  function onSubmit(values: RegisterFormValues) {
    dispatch(
      registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
      }),
    )
  }

  return (
    <AuthShell>
      <FormCard>
        <header className="space-y-2">
          <p className="font-mono text-eyebrow uppercase text-primary">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
            Join mnemo
          </p>
          <h1 className="font-display text-heading font-semibold text-base-content">
            Create your workspace
          </h1>
          <p className="text-body text-base-content/60">
            Start talking — Mnemo remembers names, facts, and threads as you go.
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
          <Field id="name" label="Name" error={errors.name?.message}>
            <input
              id="name"
              type="text"
              placeholder="Alex Rivera"
              autoComplete="name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              className={inputClass(!!errors.name)}
              {...register('name')}
            />
          </Field>

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
            hint="8+ chars, mixed case & a number"
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

          <SubmitButton loading={loading} label="Create account" loadingLabel="Creating…" />
        </form>

        <p className="mt-7 text-center text-body text-base-content/60">
          Already have a workspace?{' '}
          <Link
            to="/login"
            className="group inline-flex items-center gap-1 font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary/80 hover:decoration-primary/70"
          >
            Sign in
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </p>
      </FormCard>
    </AuthShell>
  )
}

