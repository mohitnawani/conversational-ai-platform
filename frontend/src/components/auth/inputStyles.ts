export function inputClass(invalid?: boolean): string {
  return `w-full rounded-[8px] border bg-ink-800 px-3 py-2.5 text-sm text-paper-100 shadow-sm outline-none transition-colors duration-150 placeholder:text-paper-500/50 focus:border-amber-index focus:shadow-[0_0_0_3px_rgba(217,164,65,0.15)] ${
    invalid ? 'border-red-danger' : 'border-ink-700'
  }`
}