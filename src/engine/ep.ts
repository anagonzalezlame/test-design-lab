import { markCovered, seqId, type CoverageItem, type DesignResult, type Issue, type Lang, type TestCase } from './types'

/**
 * Equivalence partitioning (ISO/IEC/IEEE 29119-4; ISTQB CTFL v4.0 §4.2.1).
 * Valid partitions are combined ("each choice"); every invalid partition gets
 * its own test case with all other inputs valid, so one failure cannot mask another.
 */

export interface EpPartition {
  id: string
  label: string
  valid: boolean
  /** Representative value used in the test case. */
  value: string
  expected: string
}

export interface EpVariable {
  id: string
  name: string
  partitions: EpPartition[]
}

export interface EpModel {
  title: string
  variables: EpVariable[]
  validExpected: string
}

const M = {
  es: {
    condition: (v: string) => `Particiones de «${v}»`,
    item: (v: string, p: string, valid: boolean) => `${v}: ${p} (${valid ? 'válida' : 'inválida'})`,
    validCase: (n: number) => `Combinación válida ${n}`,
    invalidCase: (v: string, p: string) => `«${v}» inválida: ${p}`,
    accepted: 'Se acepta la entrada.',
    rejected: 'Se rechaza la entrada.',
    empty: 'Agregá al menos una variable con particiones.',
    noValue: (v: string, p: string) =>
      `La partición «${p}» de «${v}» no tiene valor representativo: no se puede cubrir.`,
    noValid: (v: string) =>
      `«${v}» no tiene particiones válidas con valor: sin ellas no se puede aislar cada partición inválida.`,
  },
  en: {
    condition: (v: string) => `Partitions of “${v}”`,
    item: (v: string, p: string, valid: boolean) => `${v}: ${p} (${valid ? 'valid' : 'invalid'})`,
    validCase: (n: number) => `Valid combination ${n}`,
    invalidCase: (v: string, p: string) => `Invalid “${v}”: ${p}`,
    accepted: 'The input is accepted.',
    rejected: 'The input is rejected.',
    empty: 'Add at least one variable with partitions.',
    noValue: (v: string, p: string) =>
      `Partition “${p}” of “${v}” has no representative value, so it cannot be covered.`,
    noValid: (v: string) =>
      `“${v}” has no valid partition with a value; invalid partitions cannot be isolated without one.`,
  },
}

export function designEP(model: EpModel, lang: Lang): DesignResult {
  const m = M[lang]
  const issues: Issue[] = []
  const variables = model.variables.filter((v) => v.partitions.length > 0)
  if (!variables.length) return { conditions: [], items: [], cases: [], issues: [{ level: 'info', message: m.empty }] }

  const conditions = variables.map((v, i) => ({ id: seqId('CON', i + 1), label: m.condition(v.name) }))

  const itemOf = new Map<string, string>()
  const items: CoverageItem[] = []
  variables.forEach((v, vi) =>
    v.partitions.forEach((p) => {
      const id = seqId('COV', items.length + 1)
      itemOf.set(p.id, id)
      items.push({ id, label: m.item(v.name, p.label, p.valid), kind: p.valid ? 'valid' : 'invalid', conditionId: conditions[vi].id, covered: false })
      if (!p.value.trim()) issues.push({ level: 'warning', message: m.noValue(v.name, p.label) })
    }),
  )

  const usable = (v: EpVariable, valid: boolean) => v.partitions.filter((p) => p.valid === valid && p.value.trim())
  const validOf = variables.map((v) => usable(v, true))
  variables.forEach((v, i) => {
    if (!validOf[i].length) issues.push({ level: 'error', message: m.noValid(v.name) })
  })

  const cases: TestCase[] = []
  const canCombine = validOf.every((parts) => parts.length > 0)

  // Valid cases: as many as the variable with the most valid partitions.
  if (canCombine) {
    const n = Math.max(...validOf.map((parts) => parts.length))
    for (let i = 0; i < n; i++) {
      const chosen = validOf.map((parts) => parts[i % parts.length])
      cases.push({
        id: '',
        title: m.validCase(i + 1),
        inputs: variables.map((v, vi) => ({ name: v.name, value: chosen[vi].value, kind: 'valid' })),
        expected: model.validExpected.trim() || m.accepted,
        covers: chosen.map((p) => itemOf.get(p.id)!),
        kind: 'valid',
      })
    }

    // Invalid cases: one invalid partition at a time.
    variables.forEach((v, vi) =>
      usable(v, false).forEach((p) => {
        cases.push({
          id: '',
          title: m.invalidCase(v.name, p.label),
          inputs: variables.map((w, wi) =>
            wi === vi
              ? { name: w.name, value: p.value, kind: 'invalid' }
              : { name: w.name, value: validOf[wi][0].value, kind: 'valid' },
          ),
          expected: p.expected.trim() || m.rejected,
          covers: [itemOf.get(p.id)!],
          kind: 'invalid',
        })
      }),
    )
  }

  cases.forEach((c, i) => (c.id = seqId('TC', i + 1)))
  return { conditions, items: markCovered(items, cases), cases, issues }
}
