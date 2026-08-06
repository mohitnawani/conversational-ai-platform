export function inputClass(invalid?: boolean) {
  return `input w-full border border-base-content/15 bg-base-100 text-input shadow-sm transition-colors placeholder:text-base-content/35 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
    invalid ? 'input-error' : ''
  }`
}