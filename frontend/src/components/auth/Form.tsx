import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { inputClass } from './inputStyles'

/* ------------------------------------------------------------------ */
/*  Primitives                                                         */
/* ------------------------------------------------------------------ */

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950 ${className}`}
    />
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
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-paper-100">
          {label}
        </label>
        {hint ? (
          <span className="font-mono text-[0.65rem] tracking-[0.06em] text-paper-500">{hint}</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-xs text-red-danger">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
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
        className={`${inputClass(invalid)} pr-11 ${className}`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-paper-500 transition-colors duration-[120ms] hover:text-paper-100"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

/** Thin 3-segment mono-style password strength bar (red → amber → mint). */
function meterStrength(pw: string): number {
  if (!pw) return 0
  const rules = [
    pw.length >= 8,
    /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    /[0-9]/.test(pw),
    /[^a-zA-Z0-9]/.test(pw),
  ]
  return Math.min(3, rules.filter(Boolean).length)
}

const METER_COLORS = ['bg-red-danger', 'bg-amber-index', 'bg-success-mint']

export function PasswordMeter({ value }: { value: string }) {
  const strength = meterStrength(value)
  return (
    <div
      className="mt-2 flex gap-1"
      role="meter"
      aria-label="Password strength"
      aria-valuemin={0}
      aria-valuemax={3}
      aria-valuenow={strength}
    >
      {METER_COLORS.map((color, i) => (
        <span
          key={i}
          className={`h-[3px] flex-1 rounded-full transition-colors duration-150 ${
            i < strength ? color : 'bg-ink-700'
          }`}
        />
      ))}
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
      className={`flex w-full items-center justify-center gap-2 rounded-[8px] bg-amber-index px-4 py-2.5 text-sm font-medium text-ink-950 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-index hover:bg-amber-index-deep disabled:cursor-not-allowed disabled:opacity-50 ${
        loading ? 'cursor-wait' : ''
      }`}
      {...rest}
    >
      {loading ? (
        <>
          <LoadingSpinner />
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
      className="flex items-center gap-2.5 rounded-[8px] border border-red-danger/30 bg-red-tint px-3.5 py-2.5 text-sm text-red-danger"
    >
      <CircleAlert className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

