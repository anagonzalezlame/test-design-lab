import fc from 'fast-check'
import { designST, reachableStates, stateTable, type StCriterion, type StModel } from './stateTransition'
import { coverageOf } from './types'

/** Classic login with lockout after three failed attempts. */
const login = (criterion: StCriterion): StModel => ({
  title: 'Login',
  initial: 'S0',
  criterion,
  states: [
    { id: 'S0', name: 'Login' },
    { id: 'F1', name: '1 failed' },
    { id: 'F2', name: '2 failed' },
    { id: 'L', name: 'Locked' },
    { id: 'IN', name: 'Logged in' },
  ],
  events: [
    { id: 'ok', name: 'valid credentials' },
    { id: 'ko', name: 'invalid credentials' },
    { id: 'unlock', name: 'unlock' },
    { id: 'out', name: 'log out' },
  ],
  transitions: [
    { id: 't1', from: 'S0', event: 'ok', guard: '', to: 'IN', action: '' },
    { id: 't2', from: 'S0', event: 'ko', guard: '', to: 'F1', action: '' },
    { id: 't3', from: 'F1', event: 'ok', guard: '', to: 'IN', action: '' },
    { id: 't4', from: 'F1', event: 'ko', guard: '', to: 'F2', action: '' },
    { id: 't5', from: 'F2', event: 'ok', guard: '', to: 'IN', action: '' },
    { id: 't6', from: 'F2', event: 'ko', guard: '', to: 'L', action: 'notify user' },
    { id: 't7', from: 'L', event: 'unlock', guard: '', to: 'S0', action: '' },
    { id: 't8', from: 'IN', event: 'out', guard: '', to: 'S0', action: '' },
  ],
})

/** Re-walks the steps of a case through the model to check it is a real path. */
function replay(model: StModel, eventsFired: string[]) {
  let state = model.initial
  for (const e of eventsFired) {
    const t = model.transitions.find((x) => x.from === state && model.events.find((ev) => ev.id === x.event)!.name === e)
    if (!t) return null
    state = t.to
  }
  return state
}

describe('state transition testing', () => {
  it('all states: every state is visited', () => {
    const r = designST(login('states'), 'en')
    expect(r.issues).toEqual([])
    expect(coverageOf(r.items).percent).toBe(100)
  })

  it('valid transitions (0-switch): every transition is exercised by real paths', () => {
    const m = login('transitions')
    const r = designST(m, 'en')
    expect(coverageOf(r.items)).toMatchObject({ covered: 8, total: 8 })
    for (const c of r.cases) expect(replay(m, c.inputs.map((i) => i.value))).not.toBeNull()
  })

  it('all transitions: adds one test per invalid transition', () => {
    const m = login('all')
    const r = designST(m, 'en')
    const invalidPairs = 5 * 4 - 8
    expect(r.items.filter((i) => i.kind === 'invalid')).toHaveLength(invalidPairs)
    const invalidCases = r.cases.filter((c) => c.kind === 'invalid')
    expect(invalidCases).toHaveLength(invalidPairs)
    for (const c of invalidCases) expect(c.steps!.filter((s) => s.kind === 'invalid')).toHaveLength(1)
    expect(coverageOf(r.items).percent).toBe(100)
  })

  it('1-switch: covers every pair of consecutive transitions', () => {
    const r = designST(login('switch1'), 'en')
    // Pairs t_a → t_b where t_a.to === t_b.from.
    const m = login('switch1')
    const expected = m.transitions.flatMap((a) => m.transitions.filter((b) => a.to === b.from)).length
    expect(r.items).toHaveLength(expected)
    expect(coverageOf(r.items).percent).toBe(100)
  })

  it('warns about unreachable states and leaves them uncovered', () => {
    const m = login('states')
    m.states.push({ id: 'X', name: 'Orphan' })
    const r = designST(m, 'en')
    expect(r.issues.map((i) => i.message).join(' ')).toContain('Orphan')
    expect(coverageOf(r.items)).toMatchObject({ covered: 5, total: 6 })
  })

  it('builds the full state table', () => {
    const table = stateTable(login('all'))
    expect(table).toHaveLength(5)
    expect(table.flat().filter((c) => c.transitions.length === 0)).toHaveLength(12)
  })

  const arbModel = fc
    .record({
      n: fc.integer({ min: 1, max: 6 }),
      e: fc.integer({ min: 1, max: 3 }),
      edges: fc.array(fc.tuple(fc.nat(), fc.nat(), fc.nat()), { minLength: 1, maxLength: 14 }),
      criterion: fc.constantFrom<StCriterion>('states', 'transitions', 'all', 'switch1'),
    })
    .map(({ n, e, edges, criterion }): StModel => {
      const seen = new Set<string>()
      const transitions = edges
        .map(([a, b, c]) => ({ from: `s${a % n}`, event: `e${c % e}`, to: `s${b % n}` }))
        .filter((t) => !seen.has(`${t.from}${t.event}`) && seen.add(`${t.from}${t.event}`))
        .map((t, i) => ({ id: `t${i}`, guard: '', action: '', ...t }))
      return {
        title: '',
        initial: 's0',
        criterion,
        states: [...Array(n).keys()].map((i) => ({ id: `s${i}`, name: `s${i}` })),
        events: [...Array(e).keys()].map((i) => ({ id: `e${i}`, name: `e${i}` })),
        transitions,
      }
    })

  it('property: every reachable item is covered and every test is a real path from the initial state', () => {
    fc.assert(
      fc.property(arbModel, (m) => {
        const r = designST(m, 'en')
        const reachable = reachableStates(m)
        for (const c of r.cases) {
          const fired = c.inputs.map((i) => i.value)
          if (c.kind === 'invalid') {
            // All but the last event form a valid path; the last one has no transition.
            const state = replay(m, fired.slice(0, -1))
            expect(state).not.toBeNull()
            expect(replay(m, fired)).toBeNull()
          } else {
            expect(replay(m, fired)).not.toBeNull()
          }
        }
        if (m.criterion === 'states')
          for (const item of r.items) {
            const name = item.label.match(/“(.+)”/)![1]
            expect(item.covered).toBe(reachable.has(name))
          }
        if (m.criterion === 'transitions') {
          const reachableTransitions = m.transitions.filter((t) => reachable.has(t.from)).length
          expect(coverageOf(r.items).covered).toBe(reachableTransitions)
        }
      }),
      { numRuns: 300 },
    )
  })
})
