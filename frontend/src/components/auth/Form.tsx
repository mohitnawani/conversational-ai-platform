import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { inputClass } from './inputStyles'

export function FormCard({ children }: { children: ReactNode }) {
  return (
    <div className="card w-full bg-base-100 shadow-xl ring-1 ring-base-300">
      <div className="card-body gap-5 p-6 sm:p-8">{children}</div>
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="form-control w-full">
      <div className="flex items-baseline justify-between gap-2">
        <label className="label py-1" htmlFor={id}>
          <span className="label-text text-label">{label}</span>
        </label>
        {hint ? (
          <span className="label-text-alt text-helper opacity-60">{hint}</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <label className="label pt-1" htmlFor={id}>
          <span className="label-text-alt flex items-center gap-1.5 text-helper text-error">
            <CircleAlert className="h-3.5 w-3.5 shrink-0" />
            {error}
          </span>
        </label>
      ) : null}
    </div>
  )
}

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function PasswordInput({ invalid, id, className = '', ...rest }: PasswordInputProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className={`${inputClass(invalid)} pr-12 ${className}`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className="btn btn-ghost btn-sm btn-circle absolute right-1 top-1/2 -translate-y-1/2 text-base-content/50 hover:bg-base-200 hover:text-base-content"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  label: string
  loadingLabel?: string
}

export function SubmitButton({ loading, label, loadingLabel, ...rest }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || rest.disabled}
      className={`btn btn-primary w-full shadow-md shadow-primary/25 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        loading ? 'btn-disabled' : ''
      }`}
      {...rest}
    >
      {loading ? (
        <>
          <span className="loading loading-spinner loading-sm" />
          {loadingLabel ?? label}
        </>
      ) : (
        label
      )}
    </button>
  )
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="alert alert-error border-error/25 py-3 text-sm shadow-none"
    >
      <CircleAlert className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}