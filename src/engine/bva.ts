import { markCovered, seqId, type CoverageItem, type DataKind, type DesignResult, type Issue, type Lang, type TestCase, type TestCondition } from './types'

/**
 * Boundary value analysis (ISO/IEC/IEEE 29119-4; ISTQB CTFL v4.0 §4.2.2).
 * Works on an ordered domain split into contiguous partitions.
 *  - 2-value BVA: each boundary value plus its closest neighbour in the adjacent partition.
 *  - 3-value BVA: each boundary value plus both of its neighbours.
 * All arithmetic uses scaled integers, so decimal steps (0.01, 0.5…) are exact.
 */

export type BvaVariant = 2 | 3

export interface BvaPartition {
  id: string
  label: string
  /** Empty string = unbounded (only allowed for the first min / last max). */
  min: string
  max: string
  valid: boolean
  expected: string
}

export interface BvaModel {
  title: string
  variable: string
  /** Smallest meaningful increment (precision): 1, 0.01… */
  step: string
  partitions: BvaPartition[]
  variant: BvaVariant
}

const M = {
  es: {
    empty: 'Agregá al menos una partición.',
    badStep: 'El incremento tiene que ser un número mayor que cero.',
    badNumber: (p: string) => `La partición «${p}» tiene un límite que no es un número.`,
    unbounded: (p: string) => `Solo la primera partición puede no tener mínimo y solo la última puede no tener máximo («${p}»).`,
    minMax: (p: string) => `En «${p}» el mínimo es mayor que el máximo.`,
    offStep: (p: string, step: string) => `Los límites de «${p}» no son múltiplos del incremento ${step}.`,
    gap: (a: string, b: string, expected: string) =>
      `Entre «${a}» y «${b}» hay un hueco o una superposición: el mínimo de «${b}» debería ser ${expected}.`,
    boundary: (a: string, b: string, x: string, y: string) => `Límite entre «${a}» y «${b}» (${x} | ${y})`,
    lowEdge: (p: string, x: string) => `Límite inferior del dominio («${p}», ${x})`,
    highEdge: (p: string, x: string) => `Límite superior del dominio («${p}», ${x})`,
    outside: 'fuera del dominio',
    item: (v: string, value: string, where: string, isBoundary: boolean) =>
      `${v} = ${value} → ${where}${isBoundary ? ' · valor límite' : ''}`,
    accepted: 'Se acepta el valor.',
    rejected: 'Se rechaza el valor.',
  },
  en: {
    empty: 'Add at least one partition.',
    badStep: 'The step must be a number greater than zero.',
    badNumber: (p: string) => `Partition “${p}” has a boundary that is not a number.`,
    unbounded: (p: string) => `Only the first partition may have no minimum and only the last may have no maximum (“${p}”).`,
    minMax: (p: string) => `In “${p}” the minimum is greater than the maximum.`,
    offStep: (p: string, step: string) => `The boundaries of “${p}” are not multiples of the step ${step}.`,
    gap: (a: string, b: string, expected: string) =>
      `There is a gap or overlap between “${a}” and “${b}”: the minimum of “${b}” should be ${expected}.`,
    boundary: (a: string, b: string, x: string, y: string) => `Boundary between “${a}” and “${b}” (${x} | ${y})`,
    lowEdge: (p: string, x: string) => `Lower edge of the domain (“${p}”, ${x})`,
    highEdge: (p: string, x: string) => `Upper edge of the domain (“${p}”, ${x})`,
    outside: 'outside the domain',
    item: (v: string, value: string, where: string, isBoundary: boolean) =>
      `${v} = ${value} → ${where}${isBoundary ? ' · boundary value' : ''}`,
    accepted: 'The value is accepted.',
    rejected: 'The value is rejected.',
  },
}

/* ---------- exact decimal helpers ---------- */

export function decimalsOf(value: string): number {
  const s = value.trim().toLowerCase()
  if (s.includes('e')) return 0
  const dot = s.indexOf('.')
  return dot === -1 ? 0 : s.length - dot - 1
}

/** Parses a decimal string into an integer scaled by 10^d. Returns null if not a number. */
export function toScaled(value: string, d: number): bigint | null {
  const s = value.trim().replace(',', '.')
  if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return null
  const negative = s.startsWith('-')
  const [int, frac = ''] = s.replace(/^[-+]/, '').split('.')
  if (frac.length > d) return null
  const n = BigInt(int + frac.padEnd(d, '0'))
  return negative ? -n : n
}

export function fromScaled(n: bigint, d: number): string {
  const negative = n < 0n
  const abs = (negative ? -n : n).toString().padStart(d + 1, '0')
  const int = abs.slice(0, abs.length - d)
  const frac = d ? `.${abs.slice(abs.length - d)}` : ''
  return `${negative ? '-' : ''}${int}${frac}`
}

interface Range {
  p: BvaPartition
  min: bigint | null
  max: bigint | null
}

export function designBVA(model: BvaModel, lang: Lang): DesignResult {
  const m = M[lang]
  const fail = (message: string): DesignResult => ({ conditions: [], items: [], cases: [], issues: [{ level: 'error', message }] })
  const parts = model.partitions
  if (!parts.length) return { conditions: [], items: [], cases: [], issues: [{ level: 'info', message: m.empty }] }

  // Precision: enough decimals for the step and for every boundary typed.
  const d = Math.max(decimalsOf(model.step), ...parts.flatMap((p) => [decimalsOf(p.min), decimalsOf(p.max)]))
  const step = toScaled(model.step, d)
  if (step === null || step <= 0n) return fail(m.badStep)

  const issues: Issue[] = []
  const ranges: Range[] = []
  for (const [i, p] of parts.entries()) {
    const min = p.min.trim() ? toScaled(p.min, d) : null
    const max = p.max.trim() ? toScaled(p.max, d) : null
    if ((p.min.trim() && min === null) || (p.max.trim() && max === null)) return fail(m.badNumber(p.label))
    if ((min === null && i !== 0) || (max === null && i !== parts.length - 1)) return fail(m.unbounded(p.label))
    if (min !== null && max !== null && min > max) return fail(m.minMax(p.label))
    if ((min !== null && min % step !== 0n) || (max !== null && max % step !== 0n))
      issues.push({ level: 'warning', message: m.offStep(p.label, model.step) })
    ranges.push({ p, min, max })
  }
  for (let i = 1; i < ranges.length; i++) {
    const prev = ranges[i - 1]
    const cur = ranges[i]
    if (prev.max! + step !== cur.min!) return fail(m.gap(prev.p.label, cur.p.label, fromScaled(prev.max! + step, d)))
  }

  const fmt = (n: bigint) => fromScaled(n, d)
  const conditions: TestCondition[] = []
  const boundaries = new Set<bigint>()
  const first = ranges[0]
  const last = ranges[ranges.length - 1]

  if (first.min !== null) {
    conditions.push({ id: '', label: m.lowEdge(first.p.label, fmt(first.min)) })
    boundaries.add(first.min)
  }
  for (let i = 1; i < ranges.length; i++) {
    const a = ranges[i - 1]
    const b = ranges[i]
    conditions.push({ id: '', label: m.boundary(a.p.label, b.p.label, fmt(a.max!), fmt(b.min!)) })
  }
  for (const r of ranges) {
    if (r.min !== null) boundaries.add(r.min)
    if (r.max !== null) boundaries.add(r.max)
  }
  if (last.max !== null) conditions.push({ id: '', label: m.highEdge(last.p.label, fmt(last.max)) })
  conditions.forEach((c, i) => (c.id = seqId('CON', i + 1)))

  // Coverage items.
  const values = new Set<bigint>()
  if (model.variant === 2) {
    boundaries.forEach((b) => values.add(b))
    if (first.min !== null) values.add(first.min - step)
    if (last.max !== null) values.add(last.max + step)
  } else {
    boundaries.forEach((b) => [b - step, b, b + step].forEach((v) => values.add(v)))
  }

  const locate = (v: bigint) =>
    ranges.find((r) => (r.min === null || v >= r.min) && (r.max === null || v <= r.max))

  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const items: CoverageItem[] = []
  const cases: TestCase[] = []
  sorted.forEach((v, i) => {
    const r = locate(v)
    const isBoundary = boundaries.has(v)
    const valid = r?.p.valid ?? false
    const kind: DataKind = isBoundary ? 'boundary' : valid ? 'valid' : 'invalid'
    const id = seqId('COV', i + 1)
    items.push({ id, label: m.item(model.variable, fmt(v), r?.p.label ?? m.outside, isBoundary), kind, covered: false })
    cases.push({
      id: seqId('TC', i + 1),
      title: `${model.variable} = ${fmt(v)}`,
      inputs: [{ name: model.variable, value: fmt(v), kind: valid ? (isBoundary ? 'boundary' : 'valid') : 'invalid' }],
      expected: r?.p.expected.trim() || (valid ? m.accepted : m.rejected),
      covers: [id],
      kind: valid ? (isBoundary ? 'boundary' : 'valid') : 'invalid',
    })
  })

  return { conditions, items: markCovered(items, cases), cases, issues }
}
