import fc from 'fast-check'
import { allCombinations, analyzeTable, designDT, expandRule, minimizeRules, missingRules, type DtModel, type DtRule } from './decisionTable'

const conditions = [
  { id: 'reg', name: 'Registered', values: ['Y', 'N'] },
  { id: 'hist', name: 'Good history', values: ['Y', 'N'] },
  { id: 'amt', name: 'Within limit', values: ['Y', 'N'] },
]
const actions = [
  { id: 'approve', name: 'Approve' },
  { id: 'reject', name: 'Reject' },
  { id: 'refer', name: 'Refer to analyst' },
]
const rule = (id: string, reg: string, hist: string, amt: string, act: string[], feasible = true): DtRule => ({
  id,
  entries: { reg, hist, amt },
  actions: act,
  feasible,
})
const loan: DtModel = {
  title: 'Loan',
  conditions,
  actions,
  rules: [
    rule('1', 'Y', 'Y', 'Y', ['approve']),
    rule('2', 'Y', 'Y', 'N', ['refer']),
    rule('3', 'Y', 'N', '-', ['reject']),
    rule('4', 'N', '-', '-', ['reject']),
  ],
}

let counter = 0
const newId = () => `n${counter++}`

describe('decision tables', () => {
  it('a complete, consistent table yields one test per rule and no issues', () => {
    const r = designDT(loan, 'en')
    expect(r.issues).toEqual([])
    expect(r.cases).toHaveLength(4)
    expect(r.cases[3].inputs.map((i) => i.value)).toEqual(['N', 'Y (any)', 'Y (any)'])
    expect(r.cases[1].expected).toBe('Refer to analyst')
  })

  it('detects contradictions, redundancies and missing combinations', () => {
    const m: DtModel = {
      ...loan,
      rules: [
        rule('1', 'Y', 'Y', '-', ['approve']),
        rule('2', 'Y', 'Y', 'N', ['refer']), // contradicts rule 1 on (Y,Y,N)
        rule('3', 'Y', 'N', 'Y', ['reject']),
        rule('4', 'Y', 'N', 'Y', ['reject']), // redundant with rule 3
      ],
    }
    const a = analyzeTable(m)
    expect(a.contradictions.map(([x, y]) => [x, y])).toEqual([[0, 1]])
    expect(a.redundancies).toEqual([[2, 3]])
    expect(a.missing).toHaveLength(5) // (Y,N,N) + 4 with reg=N
    const levels = designDT(m, 'en').issues.map((i) => i.level)
    expect(levels).toEqual(expect.arrayContaining(['error', 'warning']))
  })

  it('missing rules complete the table', () => {
    const partial: DtModel = { ...loan, rules: loan.rules.slice(0, 2) }
    const completed: DtModel = { ...partial, rules: [...partial.rules, ...missingRules(partial, newId)] }
    expect(analyzeTable(completed).missing).toEqual([])
  })

  it('minimises the full table back to the collapsed form', () => {
    const full: DtModel = {
      ...loan,
      rules: loan.rules.flatMap((r) =>
        expandRule(r, conditions).map((combo) => rule(newId(), combo[0], combo[1], combo[2], r.actions)),
      ),
    }
    expect(full.rules).toHaveLength(8)
    const min = minimizeRules(full, newId)
    expect(min.map((r) => [r.entries.reg, r.entries.hist, r.entries.amt])).toEqual([
      ['Y', 'Y', 'Y'],
      ['Y', 'Y', 'N'],
      ['Y', 'N', '-'],
      ['N', '-', '-'],
    ])
  })

  const arbTable = fc
    .array(fc.integer({ min: 2, max: 3 }), { minLength: 1, maxLength: 4 })
    .chain((sizes) => {
      const conds = sizes.map((n, i) => ({ id: `c${i}`, name: `C${i}`, values: [...Array(n).keys()].map((v) => `v${v}`) }))
      const combos = allCombinations(conds)
      return fc
        .array(fc.tuple(fc.integer({ min: 0, max: 2 }), fc.boolean()), { minLength: combos.length, maxLength: combos.length })
        .map((outcomes): DtModel => ({
          title: '',
          conditions: conds,
          actions: [
            { id: 'a0', name: 'A0' },
            { id: 'a1', name: 'A1' },
            { id: 'a2', name: 'A2' },
          ],
          rules: combos.map((combo, i) => ({
            id: `r${i}`,
            entries: Object.fromEntries(conds.map((c, j) => [c.id, combo[j]])),
            actions: [`a${outcomes[i][0]}`],
            feasible: outcomes[i][1],
          })),
        }))
    })

  it('property: minimisation preserves behaviour and never creates overlaps', () => {
    fc.assert(
      fc.property(arbTable, (m) => {
        const min: DtModel = { ...m, rules: minimizeRules(m, newId) }
        const a = analyzeTable(min)
        expect(a.contradictions).toEqual([])
        expect(a.redundancies).toEqual([])
        expect(a.missing).toEqual([])
        expect(min.rules.length).toBeLessThanOrEqual(m.rules.length)
        const outcome = (model: DtModel) => {
          const map = new Map<string, string>()
          for (const r of model.rules)
            for (const combo of expandRule(r, model.conditions)) map.set(combo.join(), `${r.feasible}|${r.actions.join()}`)
          return map
        }
        expect(outcome(min)).toEqual(outcome(m))
      }),
    )
  })
})
