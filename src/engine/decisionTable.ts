import { markCovered, seqId, type CoverageItem, type DesignResult, type Issue, type Lang, type TestCase } from './types'

/**
 * Decision table testing (ISO/IEC/IEEE 29119-4; ISTQB CTFL v4.0 §4.2.3).
 * Rules may use "-" (don't care). The analysis expands every rule to the full
 * combinations it represents to find contradictions, redundancies and missing
 * combinations. Coverage items are the feasible rules (columns).
 */

export const DASH = '-'

export interface DtCondition {
  id: string
  name: string
  values: string[]
}

export interface DtAction {
  id: string
  name: string
}

export interface DtRule {
  id: string
  /** condition id → value or DASH */
  entries: Record<string, string>
  /** ids of the actions triggered */
  actions: string[]
  feasible: boolean
}

export interface DtModel {
  title: string
  conditions: DtCondition[]
  actions: DtAction[]
  rules: DtRule[]
}

const M = {
  es: {
    empty: 'Agregá al menos una condición con valores y una regla.',
    noValues: (c: string) => `La condición «${c}» necesita al menos dos valores.`,
    badValue: (r: string, c: string, v: string) => `La regla ${r} usa «${v}» en «${c}», que no es un valor definido.`,
    contradiction: (a: string, b: string, combo: string) =>
      `Contradicción: las reglas ${a} y ${b} se superponen en (${combo}) pero tienen distintas acciones.`,
    redundancy: (a: string, b: string) => `Redundancia: las reglas ${a} y ${b} se superponen con las mismas acciones.`,
    missing: (n: number, sample: string) =>
      `La tabla está incompleta: ${n} ${n === 1 ? 'combinación no está cubierta' : 'combinaciones no están cubiertas'} por ninguna regla (por ejemplo, ${sample}).`,
    infeasible: (r: string) => `La regla ${r} está marcada como imposible: no es un ítem de cobertura.`,
    condition: (c: string) => `Condición «${c}»`,
    rule: (r: string, desc: string) => `Regla ${r}: ${desc}`,
    any: 'cualquiera',
    noAction: 'Sin acciones.',
    case: (r: string) => `Regla ${r}`,
  },
  en: {
    empty: 'Add at least one condition with values and one rule.',
    noValues: (c: string) => `Condition “${c}” needs at least two values.`,
    badValue: (r: string, c: string, v: string) => `Rule ${r} uses “${v}” for “${c}”, which is not a defined value.`,
    contradiction: (a: string, b: string, combo: string) =>
      `Contradiction: rules ${a} and ${b} overlap on (${combo}) but trigger different actions.`,
    redundancy: (a: string, b: string) => `Redundancy: rules ${a} and ${b} overlap with the same actions.`,
    missing: (n: number, sample: string) =>
      `The table is incomplete: ${n} ${n === 1 ? 'combination is' : 'combinations are'} not covered by any rule (e.g. ${sample}).`,
    infeasible: (r: string) => `Rule ${r} is marked as infeasible, so it is not a coverage item.`,
    condition: (c: string) => `Condition “${c}”`,
    rule: (r: string, desc: string) => `Rule ${r}: ${desc}`,
    any: 'any',
    noAction: 'No actions.',
    case: (r: string) => `Rule ${r}`,
  },
}

export const ruleName = (index: number) => `R${index + 1}`

const entryOf = (rule: DtRule, c: DtCondition) => rule.entries[c.id] ?? DASH

/** All full combinations (one value per condition) represented by a rule. */
export function expandRule(rule: DtRule, conditions: DtCondition[]): string[][] {
  return conditions.reduce<string[][]>(
    (acc, c) => {
      const e = entryOf(rule, c)
      const vals = e === DASH ? c.values : [e]
      return acc.flatMap((combo) => vals.map((v) => [...combo, v]))
    },
    [[]],
  )
}

export function allCombinations(conditions: DtCondition[]): string[][] {
  return expandRule({ id: '', entries: {}, actions: [], feasible: true }, conditions)
}

const keyOf = (combo: string[]) => JSON.stringify(combo)
const signature = (rule: Pick<DtRule, 'actions' | 'feasible'>) =>
  `${rule.feasible ? 1 : 0}|${[...rule.actions].sort().join(',')}`

export interface DtAnalysis {
  contradictions: [number, number, string[]][]
  redundancies: [number, number][]
  missing: string[][]
}

export function analyzeTable(model: DtModel): DtAnalysis {
  const owners = new Map<string, number[]>()
  model.rules.forEach((r, i) =>
    expandRule(r, model.conditions).forEach((combo) => {
      const k = keyOf(combo)
      owners.set(k, [...(owners.get(k) ?? []), i])
    }),
  )
  const contradictions: DtAnalysis['contradictions'] = []
  const redundancies: DtAnalysis['redundancies'] = []
  const seen = new Set<string>()
  for (const [k, list] of owners) {
    for (let a = 0; a < list.length; a++)
      for (let b = a + 1; b < list.length; b++) {
        const pair = `${list[a]}-${list[b]}`
        if (seen.has(pair)) continue
        seen.add(pair)
        const ra = model.rules[list[a]]
        const rb = model.rules[list[b]]
        if (signature(ra) !== signature(rb)) contradictions.push([list[a], list[b], JSON.parse(k)])
        else redundancies.push([list[a], list[b]])
      }
  }
  const missing = allCombinations(model.conditions).filter((c) => !owners.has(keyOf(c)))
  return { contradictions, redundancies, missing }
}

/** Rules (without "-") for the combinations not covered yet, with no actions. */
export function missingRules(model: DtModel, newId: () => string): DtRule[] {
  return analyzeTable(model).missing.map((combo) => ({
    id: newId(),
    entries: Object.fromEntries(model.conditions.map((c, i) => [c.id, combo[i]])),
    actions: [],
    feasible: true,
  }))
}

/**
 * Collapses the table: repeatedly merges rules that share actions/feasibility and
 * all other entries, and that together list every value of one condition, into a
 * single rule with "-" for that condition. Requires a table without contradictions.
 */
export function minimizeRules(model: DtModel, newId: () => string): DtRule[] {
  const { conditions } = model
  // Start from the full expansion so the result does not depend on how rules were typed.
  const full = new Map<string, DtRule>()
  for (const r of model.rules)
    for (const combo of expandRule(r, conditions))
      full.set(keyOf(combo), {
        id: '',
        entries: Object.fromEntries(conditions.map((c, i) => [c.id, combo[i]])),
        actions: [...r.actions].sort(),
        feasible: r.feasible,
      })

  let rules = [...full.values()]
  let changed = true
  while (changed) {
    changed = false
    // Last conditions first: "-" ends up on the right, as decision tables are usually written.
    for (const c of [...conditions].reverse()) {
      const groups = new Map<string, DtRule[]>()
      for (const r of rules) {
        if (entryOf(r, c) === DASH) continue
        const rest = conditions.filter((o) => o.id !== c.id).map((o) => entryOf(r, o))
        const k = `${signature(r)}#${JSON.stringify(rest)}`
        groups.set(k, [...(groups.get(k) ?? []), r])
      }
      for (const group of groups.values()) {
        const present = new Set(group.map((r) => entryOf(r, c)))
        if (c.values.every((v) => present.has(v)) && group.length === c.values.length) {
          rules = rules.filter((r) => !group.includes(r))
          rules.push({ ...group[0], entries: { ...group[0].entries, [c.id]: DASH } })
          changed = true
        }
      }
    }
  }

  // Stable, readable order: by the value index of each condition ("-" last).
  const rank = (r: DtRule) =>
    conditions.map((c) => {
      const e = entryOf(r, c)
      return e === DASH ? c.values.length : c.values.indexOf(e)
    })
  rules.sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i]
    return 0
  })
  return rules.map((r) => ({ ...r, id: newId() }))
}

export function designDT(model: DtModel, lang: Lang): DesignResult {
  const m = M[lang]
  const { conditions, actions } = model
  if (!conditions.length || !model.rules.length)
    return { conditions: [], items: [], cases: [], issues: [{ level: 'info', message: m.empty }] }

  const issues: Issue[] = []
  for (const c of conditions) if (c.values.length < 2) issues.push({ level: 'error', message: m.noValues(c.name) })
  model.rules.forEach((r, i) =>
    conditions.forEach((c) => {
      const e = entryOf(r, c)
      if (e !== DASH && !c.values.includes(e)) issues.push({ level: 'error', message: m.badValue(ruleName(i), c.name, e) })
    }),
  )
  if (issues.some((i) => i.level === 'error')) return { conditions: [], items: [], cases: [], issues }

  const analysis = analyzeTable(model)
  const comboText = (combo: string[]) => conditions.map((c, i) => `${c.name}=${combo[i]}`).join(', ')
  for (const [a, b, combo] of analysis.contradictions)
    issues.push({ level: 'error', message: m.contradiction(ruleName(a), ruleName(b), comboText(combo)) })
  for (const [a, b] of analysis.redundancies)
    issues.push({ level: 'warning', message: m.redundancy(ruleName(a), ruleName(b)) })
  if (analysis.missing.length)
    issues.push({ level: 'warning', message: m.missing(analysis.missing.length, comboText(analysis.missing[0])) })

  const testConditions = conditions.map((c, i) => ({ id: seqId('CON', i + 1), label: m.condition(c.name) }))
  const actionName = (id: string) => actions.find((a) => a.id === id)?.name ?? id

  const items: CoverageItem[] = []
  const cases: TestCase[] = []
  model.rules.forEach((r, i) => {
    const name = ruleName(i)
    if (!r.feasible) {
      issues.push({ level: 'info', message: m.infeasible(name) })
      return
    }
    const desc = conditions.map((c) => `${c.name}=${entryOf(r, c) === DASH ? '–' : entryOf(r, c)}`).join(', ')
    const id = seqId('COV', items.length + 1)
    items.push({ id, label: m.rule(name, desc), kind: 'neutral', covered: false })
    const triggered = actions.filter((a) => r.actions.includes(a.id)).map((a) => actionName(a.id))
    cases.push({
      id: '',
      title: m.case(name),
      inputs: conditions.map((c) => {
        const e = entryOf(r, c)
        return { name: c.name, value: e === DASH ? `${c.values[0]} (${m.any})` : e, kind: 'neutral' }
      }),
      expected: triggered.length ? triggered.join(' + ') : m.noAction,
      covers: [id],
      kind: 'neutral',
    })
  })

  cases.forEach((c, i) => (c.id = seqId('TC', i + 1)))
  return { conditions: testConditions, items: markCovered(items, cases), cases, issues }
}
