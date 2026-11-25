export type Lang = 'es' | 'en'

/** Classification of a value or test case, used for colour coding. */
export type DataKind = 'valid' | 'invalid' | 'boundary' | 'neutral'

/** ISO/IEC/IEEE 29119-4: test conditions → coverage items → test cases. */
export interface TestCondition {
  id: string
  label: string
}

export interface CoverageItem {
  id: string
  label: string
  kind: DataKind
  conditionId?: string
  covered: boolean
}

export interface TestInput {
  name: string
  value: string
  kind: DataKind
}

export interface TestStep {
  action: string
  expected: string
  kind: DataKind
}

export interface TestCase {
  id: string
  title: string
  inputs: TestInput[]
  steps?: TestStep[]
  expected: string
  /** Coverage item ids exercised by this case. */
  covers: string[]
  kind: DataKind
}

export interface Issue {
  level: 'error' | 'warning' | 'info'
  message: string
}

export interface DesignResult {
  conditions: TestCondition[]
  items: CoverageItem[]
  cases: TestCase[]
  issues: Issue[]
}

export interface Coverage {
  covered: number
  total: number
  percent: number
}

export function coverageOf(items: CoverageItem[]): Coverage {
  const covered = items.filter((i) => i.covered).length
  const total = items.length
  return { covered, total, percent: total ? Math.round((covered / total) * 1000) / 10 : 0 }
}

/** Sequential, zero-padded ids: TC-01, COV-12… */
export const seqId = (prefix: string, n: number) => `${prefix}-${String(n).padStart(2, '0')}`

/** Marks coverage items as covered according to the cases' `covers` lists. */
export function markCovered(items: CoverageItem[], cases: TestCase[]): CoverageItem[] {
  const hit = new Set(cases.flatMap((c) => c.covers))
  return items.map((i) => ({ ...i, covered: hit.has(i.id) }))
}
