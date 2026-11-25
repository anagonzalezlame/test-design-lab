import type { DataKind } from '../engine/types'

/** Colour is reserved for data classification: valid, invalid and boundary values. */
export const kindChip: Record<DataKind, string> = {
  valid: 'bg-emerald-50 text-emerald-900 ring-emerald-600/25 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/30',
  invalid: 'bg-red-50 text-red-900 ring-red-600/25 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-400/30',
  boundary: 'bg-amber-50 text-amber-900 ring-amber-600/30 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/30',
  neutral: 'bg-neutral-100 text-neutral-800 ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700',
}

export const kindDot: Record<DataKind, string> = {
  valid: 'bg-emerald-500',
  invalid: 'bg-red-500',
  boundary: 'bg-amber-500',
  neutral: 'bg-neutral-400',
}

export const kindFill: Record<DataKind, string> = {
  valid: 'fill-emerald-100 stroke-emerald-600 dark:fill-emerald-500/15 dark:stroke-emerald-400',
  invalid: 'fill-red-100 stroke-red-600 dark:fill-red-500/15 dark:stroke-red-400',
  boundary: 'fill-amber-100 stroke-amber-600 dark:fill-amber-500/15 dark:stroke-amber-400',
  neutral: 'fill-white stroke-neutral-400 dark:fill-neutral-900 dark:stroke-neutral-500',
}
