import fc from 'fast-check'
import { designBVA, fromScaled, toScaled, type BvaModel } from './bva'
import { coverageOf } from './types'

const ages = (variant: 2 | 3): BvaModel => ({
  title: 'Age',
  variable: 'age',
  step: '1',
  variant,
  partitions: [
    { id: 'p1', label: 'minor', min: '0', max: '17', valid: false, expected: 'Rejected' },
    { id: 'p2', label: 'adult', min: '18', max: '64', valid: true, expected: 'Standard' },
    { id: 'p3', label: 'senior', min: '65', max: '120', valid: true, expected: 'Senior' },
  ],
})

const values = (m: BvaModel) => designBVA(m, 'en').cases.map((c) => c.inputs[0].value)

describe('boundary value analysis', () => {
  it('2-value: every boundary plus the neighbours outside the domain', () => {
    expect(values(ages(2))).toEqual(['-1', '0', '17', '18', '64', '65', '120', '121'])
  })

  it('3-value: every boundary with both neighbours', () => {
    expect(values(ages(3))).toEqual([
      '-1', '0', '1', '16', '17', '18', '19', '63', '64', '65', '66', '119', '120', '121',
    ])
  })

  it('classifies values by partition and uses each partition expected result', () => {
    const r = designBVA(ages(2), 'en')
    const byValue = Object.fromEntries(r.cases.map((c) => [c.inputs[0].value, c]))
    expect(byValue['17'].expected).toBe('Rejected')
    expect(byValue['18'].expected).toBe('Standard')
    expect(byValue['121'].kind).toBe('invalid')
    expect(coverageOf(r.items).percent).toBe(100)
    expect(r.conditions).toHaveLength(4) // 2 domain edges + 2 internal boundaries
  })

  it('is exact with decimal steps', () => {
    const m: BvaModel = {
      title: '',
      variable: 'amount',
      step: '0.01',
      variant: 3,
      partitions: [
        { id: 'a', label: 'low', min: '0.10', max: '0.20', valid: true, expected: '' },
        { id: 'b', label: 'high', min: '0.21', max: '', valid: true, expected: '' },
      ],
    }
    expect(values(m)).toEqual(['0.09', '0.10', '0.11', '0.19', '0.20', '0.21', '0.22'])
  })

  it('rejects gaps and overlaps between partitions', () => {
    const m = ages(2)
    m.partitions[1].min = '19'
    const r = designBVA(m, 'en')
    expect(r.cases).toEqual([])
    expect(r.issues[0]).toMatchObject({ level: 'error' })
    expect(r.issues[0].message).toContain('18')
  })

  it('round-trips scaled decimals', () => {
    expect(fromScaled(toScaled('-0.05', 2)!, 2)).toBe('-0.05')
    expect(fromScaled(toScaled('12.5', 3)!, 3)).toBe('12.500')
    expect(toScaled('abc', 0)).toBeNull()
  })

  const arbModel = fc
    .record({
      start: fc.integer({ min: -50, max: 50 }),
      widths: fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 5 }),
      valid: fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
      variant: fc.constantFrom(2 as const, 3 as const),
    })
    .map(({ start, widths, valid, variant }): BvaModel => {
      let cursor = start
      return {
        title: '',
        variable: 'x',
        step: '1',
        variant,
        partitions: widths.map((w, i) => {
          const p = { id: `p${i}`, label: `P${i}`, min: String(cursor), max: String(cursor + w), valid: valid[i], expected: '' }
          cursor += w + 1
          return p
        }),
      }
    })

  it('property: boundaries are always included and each value is classified correctly', () => {
    fc.assert(
      fc.property(arbModel, (m) => {
        const vals = values(m).map(Number)
        const bounds = m.partitions.flatMap((p) => [Number(p.min), Number(p.max)])
        for (const b of bounds) expect(vals).toContain(b)
        const r = designBVA(m, 'en')
        for (const c of r.cases) {
          const v = Number(c.inputs[0].value)
          const p = m.partitions.find((x) => v >= Number(x.min) && v <= Number(x.max))
          expect(c.kind === 'invalid').toBe(!p || !p.valid)
        }
        expect(coverageOf(r.items).percent).toBe(100)
      }),
    )
  })

  it('property: 3-value analysis is a superset of 2-value analysis', () => {
    fc.assert(
      fc.property(arbModel, (m) => {
        const two = values({ ...m, variant: 2 })
        const three = values({ ...m, variant: 3 })
        for (const v of two) expect(three).toContain(v)
      }),
    )
  })
})
