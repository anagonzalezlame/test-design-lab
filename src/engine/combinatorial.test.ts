import fc from 'fast-check'
import { designCB, ipog, Space, type CbModel, type Row } from './combinatorial'
import { coverageOf } from './types'

const config = (strategy: CbModel['strategy']): CbModel => ({
  title: 'Web config',
  strategy,
  params: [
    { id: 'b', name: 'Browser', values: ['Chrome', 'Firefox', 'Safari', 'Edge'], base: 0 },
    { id: 'o', name: 'OS', values: ['Windows', 'macOS', 'Linux'], base: 0 },
    { id: 'l', name: 'Language', values: ['ES', 'EN'], base: 0 },
    { id: 'd', name: 'Device', values: ['Desktop', 'Mobile'], base: 0 },
  ],
  constraints: [
    { id: 'c1', entries: [{ param: 'b', value: 'Safari' }, { param: 'o', value: 'Windows' }] },
    { id: 'c2', entries: [{ param: 'b', value: 'Safari' }, { param: 'o', value: 'Linux' }] },
  ],
})

const allRows = (sizes: number[]): Row[] =>
  sizes.reduce<Row[]>((acc, n) => acc.flatMap((r) => [...Array(n).keys()].map((v) => [...r, v])), [[]])

describe('combinatorial testing', () => {
  it('pairwise covers every feasible pair with far fewer tests than all combinations', () => {
    const r = designCB(config('pairwise'), 'en')
    expect(coverageOf(r.items).percent).toBe(100)
    expect(r.cases.length).toBeLessThanOrEqual(14)
    expect(r.cases.length).toBeGreaterThanOrEqual(12) // lower bound: 4 × 3 values of the two largest params
    for (const c of r.cases) {
      const v = Object.fromEntries(c.inputs.map((i) => [i.name, i.value]))
      expect(v.Browser === 'Safari' && v.OS !== 'macOS').toBe(false)
    }
    // Safari·Windows and Safari·Linux are impossible: reported, not coverage items.
    expect(r.items.some((i) => i.label.includes('Safari') && i.label.includes('Windows'))).toBe(false)
    expect(r.issues[0]).toMatchObject({ level: 'info' })
  })

  it('each choice uses every value at least once', () => {
    const r = designCB(config('each'), 'en')
    expect(coverageOf(r.items).percent).toBe(100)
    expect(r.cases.length).toBe(4)
  })

  it('base choice varies one parameter at a time from the base test', () => {
    const r = designCB(config('base'), 'en')
    expect(r.cases[0].title).toBe('Base test')
    // Safari cannot be combined with the base OS (Windows): reported as a warning.
    expect(r.issues.some((i) => i.level === 'warning' && i.message.includes('Safari'))).toBe(true)
    for (const c of r.cases.slice(1)) {
      const differences = c.inputs.filter((inp, i) => inp.value !== r.cases[0].inputs[i].value)
      expect(differences).toHaveLength(1)
    }
  })

  it('stays fast on a large model (10 parameters × 5 values, with constraints)', () => {
    const big: CbModel = {
      title: '',
      strategy: 'pairwise',
      params: [...Array(10).keys()].map((p) => ({ id: `p${p}`, name: `P${p}`, values: ['a', 'b', 'c', 'd', 'e'], base: 0 })),
      constraints: [
        { id: 'k1', entries: [{ param: 'p0', value: 'a' }, { param: 'p1', value: 'b' }] },
        { id: 'k2', entries: [{ param: 'p2', value: 'c' }, { param: 'p3', value: 'd' }] },
        { id: 'k3', entries: [{ param: 'p4', value: 'e' }, { param: 'p5', value: 'a' }, { param: 'p6', value: 'b' }] },
      ],
    }
    const start = performance.now()
    const r = designCB(big, 'en')
    const elapsed = performance.now() - start
    expect(coverageOf(r.items).percent).toBe(100)
    expect(r.cases.length).toBeLessThan(60) // vs 9,765,625 exhaustive combinations
    expect(elapsed).toBeLessThan(3000)
  })

  it('is deterministic', () => {
    const a = designCB(config('pairwise'), 'en').cases.map((c) => c.inputs.map((i) => i.value))
    const b = designCB(config('pairwise'), 'en').cases.map((c) => c.inputs.map((i) => i.value))
    expect(a).toEqual(b)
  })

  const arbSpace = fc
    .array(fc.integer({ min: 1, max: 4 }), { minLength: 2, maxLength: 6 })
    .chain((sizes) =>
      fc
        .array(
          fc.tuple(fc.nat(), fc.nat(), fc.nat(), fc.nat()).map(([a, b, va, vb]) => {
            const p = a % sizes.length
            let q = b % sizes.length
            if (q === p) q = (q + 1) % sizes.length
            return [
              [p, va % sizes[p]],
              [q, vb % sizes[q]],
            ] as [number, number][]
          }),
          { maxLength: 4 },
        )
        .map((rules) => new Space(sizes, rules)),
    )

  it('property: pairwise covers every feasible pair and never violates a constraint', () => {
    fc.assert(
      fc.property(arbSpace, (space) => {
        const { rows } = ipog(space)
        const n = space.sizes.length
        for (const row of rows) {
          expect(row.every((v) => v !== null)).toBe(true)
          expect(space.isValid(row)).toBe(true)
        }
        // Brute force: pairs present in at least one valid full combination.
        const feasible = new Set<string>()
        const covered = new Set<string>()
        const pairs = (row: Row, into: Set<string>) => {
          for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) into.add(`${a}:${row[a]}|${b}:${row[b]}`)
        }
        allRows(space.sizes).filter((r) => space.isValid(r)).forEach((r) => pairs(r, feasible))
        rows.forEach((r) => pairs(r, covered))
        for (const p of feasible) expect(covered.has(p)).toBe(true)
        expect(rows.length).toBeLessThanOrEqual(Math.max(1, allRows(space.sizes).length))
      }),
      { numRuns: 300 },
    )
  })
})
