import { markCovered, seqId, type CoverageItem, type DesignResult, type Issue, type Lang, type TestCase } from './types'

/**
 * Combinatorial test design (ISO/IEC/IEEE 29119-4; ISTQB CTAL-TA).
 *  - pairwise:   every feasible pair of values of any two parameters (IPOG algorithm)
 *  - each:       every value of every parameter at least once (each choice)
 *  - base:       a base test plus one test per non-base value (base choice)
 * Constraints are forbidden partial assignments (e.g. Safari + Windows).
 * Generation is deterministic: the same model always yields the same suite.
 */

export type CbStrategy = 'pairwise' | 'each' | 'base'

export interface CbParam {
  id: string
  name: string
  values: string[]
  /** Index of the base value (base choice). */
  base: number
}

export interface CbConstraint {
  id: string
  entries: { param: string; value: string }[]
}

export interface CbModel {
  title: string
  params: CbParam[]
  constraints: CbConstraint[]
  strategy: CbStrategy
}

const M = {
  es: {
    empty: 'Agregá al menos un parámetro con valores.',
    noValues: (p: string) => `El parámetro «${p}» no tiene valores.`,
    badConstraint: (n: number) => `La restricción ${n} usa un parámetro o valor que no existe; se ignora.`,
    infeasible: (n: number, sample: string) =>
      `${n} ${n === 1 ? 'combinación requerida es imposible' : 'combinaciones requeridas son imposibles'} por las restricciones y no ${n === 1 ? 'es un ítem' : 'son ítems'} de cobertura (por ejemplo, ${sample}).`,
    baseInvalid: 'La prueba base viola una restricción: elegí otros valores base.',
    baseVariantInvalid: (p: string, v: string) => `No se puede variar «${p}» a «${v}» sin violar una restricción.`,
    condPairs: (a: string, b: string) => `Pares de «${a}» × «${b}»`,
    condValues: (p: string) => `Valores de «${p}»`,
    condBase: 'Prueba base',
    baseItem: 'Combinación base',
    case: (n: number) => `Combinación ${n}`,
    baseCase: 'Prueba base',
    variantCase: (p: string, v: string) => `Base con «${p}» = ${v}`,
    expected: 'El sistema funciona correctamente con esta configuración.',
  },
  en: {
    empty: 'Add at least one parameter with values.',
    noValues: (p: string) => `Parameter “${p}” has no values.`,
    badConstraint: (n: number) => `Constraint ${n} uses a parameter or value that does not exist; it is ignored.`,
    infeasible: (n: number, sample: string) =>
      `${n} required ${n === 1 ? 'combination is' : 'combinations are'} impossible under the constraints and ${n === 1 ? 'is not a coverage item' : 'are not coverage items'} (e.g. ${sample}).`,
    baseInvalid: 'The base test violates a constraint: choose other base values.',
    baseVariantInvalid: (p: string, v: string) => `“${p}” cannot be varied to “${v}” without violating a constraint.`,
    condPairs: (a: string, b: string) => `Pairs of “${a}” × “${b}”`,
    condValues: (p: string) => `Values of “${p}”`,
    condBase: 'Base test',
    baseItem: 'Base combination',
    case: (n: number) => `Combination ${n}`,
    baseCase: 'Base test',
    variantCase: (p: string, v: string) => `Base with “${p}” = ${v}`,
    expected: 'The system works correctly with this configuration.',
  },
}

/** A row holds one value index per parameter; null = not decided yet ("don't care"). */
export type Row = (number | null)[]
/** Constraint as parameter index → value index. */
type Rule = [number, number][]

export class Space {
  readonly sizes: number[]
  readonly rules: Rule[]

  constructor(sizes: number[], rules: Rule[]) {
    this.sizes = sizes
    this.rules = rules
  }

  /** A (partial) row is valid when no constraint is fully matched. */
  isValid(row: Row): boolean {
    return !this.rules.some((rule) => rule.every(([p, v]) => row[p] === v))
  }

  /** Fills the nulls of a row (depth-first, values in order) keeping it valid. */
  complete(row: Row, prefer?: (p: number, row: Row) => number[]): Row | null {
    if (!this.isValid(row)) return null
    const r = [...row]
    const open = r.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0)
    let budget = 200_000
    const go = (k: number): boolean => {
      if (k === open.length) return true
      const p = open[k]
      const order = prefer ? prefer(p, r) : [...Array(this.sizes[p]).keys()]
      for (const v of order) {
        if (--budget < 0) return false
        r[p] = v
        if (this.isValid(r) && go(k + 1)) return true
      }
      r[p] = null
      return false
    }
    return go(0) ? r : null
  }

  /** A pair is directly forbidden when some constraint only involves those two assignments. */
  pairForbidden(p1: number, v1: number, p2: number, v2: number): boolean {
    const row: Row = this.sizes.map(() => null)
    row[p1] = v1
    row[p2] = v2
    return !this.isValid(row)
  }

  /** True when the partial assignment can be extended to a full valid row. */
  feasible(row: Row): boolean {
    return this.complete(row) !== null
  }
}

const pairKey = (p1: number, v1: number, p2: number, v2: number) => `${p1}:${v1}|${p2}:${v2}`

/** IPOG (in-parameter-order) pairwise generation, constraint aware. */
export function ipog(space: Space): { rows: Row[]; infeasible: [number, number, number, number][] } {
  const n = space.sizes.length
  const blank = (): Row => Array(n).fill(null)
  if (n === 0) return { rows: [], infeasible: [] }
  if (n === 1) {
    const rows = [...Array(space.sizes[0]).keys()].map((v) => [v] as Row).filter((r) => space.isValid(r))
    return { rows, infeasible: [] }
  }

  // Required pairs = all pairs that some valid full row can contain.
  const required = new Set<string>()
  const infeasible: [number, number, number, number][] = []
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let va = 0; va < space.sizes[a]; va++)
        for (let vb = 0; vb < space.sizes[b]; vb++) {
          const r = blank()
          r[a] = va
          r[b] = vb
          if (space.feasible(r)) required.add(pairKey(a, va, b, vb))
          else infeasible.push([a, va, b, vb])
        }

  // Initial rows: every feasible combination of the first two parameters.
  let rows: Row[] = []
  for (let v0 = 0; v0 < space.sizes[0]; v0++)
    for (let v1 = 0; v1 < space.sizes[1]; v1++) {
      if (!required.has(pairKey(0, v0, 1, v1))) continue
      const r = blank()
      r[0] = v0
      r[1] = v1
      rows.push(r)
    }

  for (let k = 2; k < n; k++) {
    const uncovered = new Set<string>()
    for (let i = 0; i < k; i++)
      for (let vi = 0; vi < space.sizes[i]; vi++)
        for (let vk = 0; vk < space.sizes[k]; vk++)
          if (required.has(pairKey(i, vi, k, vk))) uncovered.add(pairKey(i, vi, k, vk))

    const gain = (row: Row, vk: number) => {
      let g = 0
      for (let i = 0; i < k; i++) if (row[i] !== null && uncovered.has(pairKey(i, row[i]!, k, vk))) g++
      return g
    }
    const take = (row: Row) => {
      for (let i = 0; i < k; i++) if (row[i] !== null && row[k] !== null) uncovered.delete(pairKey(i, row[i]!, k, row[k]!))
    }

    // Horizontal growth: extend each existing row with the most useful value of parameter k.
    for (const row of rows) {
      let best = -1
      let bestGain = -1
      for (let vk = 0; vk < space.sizes[k]; vk++) {
        const candidate = [...row]
        candidate[k] = vk
        if (!space.feasible(candidate)) continue
        const g = gain(row, vk)
        if (g > bestGain) {
          best = vk
          bestGain = g
        }
      }
      if (best >= 0) {
        row[k] = best
        take(row)
      }
    }

    // Vertical growth: place each remaining pair in a compatible row or in a new one.
    for (const key of [...uncovered]) {
      if (!uncovered.has(key)) continue
      const [[i, vi], [, vk]] = key.split('|').map((s) => s.split(':').map(Number)) as [[number, number], [number, number]]
      let placed = false
      for (const row of rows) {
        const fits = (row[i] === null || row[i] === vi) && (row[k] === null || row[k] === vk)
        if (!fits) continue
        const candidate = [...row]
        candidate[i] = vi
        candidate[k] = vk
        if (!space.feasible(candidate)) continue
        row[i] = vi
        row[k] = vk
        take(row)
        placed = true
        break
      }
      if (!placed) {
        const r = blank()
        r[i] = vi
        r[k] = vk
        rows.push(r)
        take(r)
      }
    }
  }

  // Fill the remaining "don't care" slots, preferring values that cover more pairs.
  const covered = new Set<string>()
  const record = (row: Row) => {
    for (let a = 0; a < n; a++)
      for (let b = a + 1; b < n; b++) if (row[a] !== null && row[b] !== null) covered.add(pairKey(a, row[a]!, b, row[b]!))
  }
  rows.forEach(record)
  const prefer = (p: number, row: Row) =>
    [...Array(space.sizes[p]).keys()].sort((x, y) => {
      const score = (v: number) =>
        row.reduce<number>((s, w, q) => {
          if (q === p || w === null) return s
          const key = q < p ? pairKey(q, w, p, v) : pairKey(p, v, q, w)
          return s + (required.has(key) && !covered.has(key) ? 1 : 0)
        }, 0)
      return score(y) - score(x) || x - y
    })

  rows = rows
    .map((row) => {
      const full = space.complete(row, prefer)
      if (full) record(full)
      return full
    })
    .filter((r): r is Row => r !== null)

  // Safety net: any required pair still missing gets its own completed row.
  for (const key of required) {
    if (covered.has(key)) continue
    const [[a, va], [b, vb]] = key.split('|').map((s) => s.split(':').map(Number)) as [[number, number], [number, number]]
    const r = blank()
    r[a] = va
    r[b] = vb
    const full = space.complete(r, prefer)
    if (full) {
      rows.push(full)
      record(full)
    }
  }

  return { rows, infeasible }
}

export function designCB(model: CbModel, lang: Lang): DesignResult {
  const m = M[lang]
  const params = model.params
  if (!params.length) return { conditions: [], items: [], cases: [], issues: [{ level: 'info', message: m.empty }] }

  const issues: Issue[] = []
  for (const p of params) if (!p.values.length) issues.push({ level: 'error', message: m.noValues(p.name) })
  if (issues.length) return { conditions: [], items: [], cases: [], issues }

  const rules: Rule[] = []
  model.constraints.forEach((c, i) => {
    const rule: Rule = c.entries.map((e) => {
      const p = params.findIndex((x) => x.id === e.param)
      return [p, p < 0 ? -1 : params[p].values.indexOf(e.value)]
    })
    if (!rule.length || rule.some(([p, v]) => p < 0 || v < 0)) issues.push({ level: 'warning', message: m.badConstraint(i + 1) })
    else rules.push(rule)
  })
  const space = new Space(
    params.map((p) => p.values.length),
    rules,
  )
  const label = (p: number, v: number) => `${params[p].name}=${params[p].values[v]}`

  const conditions: { id: string; label: string }[] = []
  const items: CoverageItem[] = []
  const cases: TestCase[] = []
  const addCondition = (text: string) => {
    const id = seqId('CON', conditions.length + 1)
    conditions.push({ id, label: text })
    return id
  }
  const itemIds = new Map<string, string>()
  const addItem = (key: string, text: string, conditionId: string) => {
    const id = seqId('COV', items.length + 1)
    items.push({ id, label: text, kind: 'neutral', conditionId, covered: false })
    itemIds.set(key, id)
  }
  const toCase = (row: Row, title: string, covers: string[]): TestCase => ({
    id: '',
    title,
    inputs: params.map((p, i) => ({ name: p.name, value: p.values[row[i]!], kind: 'neutral' })),
    expected: m.expected,
    covers,
    kind: 'neutral',
  })

  if (model.strategy === 'pairwise' && params.length > 1) {
    const { rows, infeasible } = ipog(space)
    for (let a = 0; a < params.length; a++)
      for (let b = a + 1; b < params.length; b++) {
        const cond = addCondition(m.condPairs(params[a].name, params[b].name))
        for (let va = 0; va < params[a].values.length; va++)
          for (let vb = 0; vb < params[b].values.length; vb++) {
            if (infeasible.some(([x, y, z, w]) => x === a && y === va && z === b && w === vb)) continue
            addItem(pairKey(a, va, b, vb), `${label(a, va)} · ${label(b, vb)}`, cond)
          }
      }
    if (infeasible.length) {
      const [a, va, b, vb] = infeasible[0]
      issues.push({ level: 'info', message: m.infeasible(infeasible.length, `${label(a, va)} · ${label(b, vb)}`) })
    }
    rows.forEach((row, i) => {
      const covers: string[] = []
      for (let a = 0; a < params.length; a++)
        for (let b = a + 1; b < params.length; b++) {
          const id = itemIds.get(pairKey(a, row[a]!, b, row[b]!))
          if (id) covers.push(id)
        }
      cases.push(toCase(row, m.case(i + 1), covers))
    })
  } else if (model.strategy === 'base') {
    const condBase = addCondition(m.condBase)
    addItem('base', m.baseItem, condBase)
    const base: Row = params.map((p) => Math.min(Math.max(p.base, 0), p.values.length - 1))
    if (!space.isValid(base)) {
      issues.push({ level: 'error', message: m.baseInvalid })
    } else {
      cases.push(toCase(base, m.baseCase, [itemIds.get('base')!]))
      params.forEach((p, i) => {
        const cond = addCondition(m.condValues(p.name))
        p.values.forEach((value, v) => {
          if (v === base[i]) return
          addItem(`${i}:${v}`, label(i, v), cond)
          const row = [...base]
          row[i] = v
          if (space.isValid(row)) cases.push(toCase(row, m.variantCase(p.name, value), [itemIds.get(`${i}:${v}`)!]))
          else issues.push({ level: 'warning', message: m.baseVariantInvalid(p.name, value) })
        })
      })
    }
  } else {
    // Each choice (also used for pairwise with a single parameter).
    const uncovered = new Set<string>()
    params.forEach((p, i) => {
      const cond = addCondition(m.condValues(p.name))
      p.values.forEach((_, v) => {
        const r: Row = params.map(() => null)
        r[i] = v
        if (!space.feasible(r)) return
        addItem(`${i}:${v}`, label(i, v), cond)
        uncovered.add(`${i}:${v}`)
      })
    })
    while (uncovered.size) {
      const row: Row = params.map(() => null)
      params.forEach((p, i) => {
        for (let v = 0; v < p.values.length; v++) {
          if (!uncovered.has(`${i}:${v}`)) continue
          const candidate = [...row]
          candidate[i] = v
          if (space.feasible(candidate)) {
            row[i] = v
            break
          }
        }
      })
      const full = space.complete(row)
      if (!full) break
      const covers = full.map((v, i) => `${i}:${v}`).filter((k) => uncovered.has(k))
      if (!covers.length) break
      covers.forEach((k) => uncovered.delete(k))
      cases.push(toCase(full, m.case(cases.length + 1), full.map((v, i) => itemIds.get(`${i}:${v}`)!).filter(Boolean)))
    }
  }

  cases.forEach((c, i) => (c.id = seqId('TC', i + 1)))
  return { conditions, items: markCovered(items, cases), cases, issues }
}
