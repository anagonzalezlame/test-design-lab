import fc from 'fast-check'
import { designEP, type EpModel } from './ep'
import { coverageOf } from './types'

const model: EpModel = {
  title: 'Insurance quote',
  validExpected: 'Quote shown',
  variables: [
    {
      id: 'age',
      name: 'Age',
      partitions: [
        { id: 'a1', label: '< 18', valid: false, value: '17', expected: 'Under-age error' },
        { id: 'a2', label: '18–65', valid: true, value: '40', expected: '' },
        { id: 'a3', label: '> 65', valid: true, value: '70', expected: '' },
      ],
    },
    {
      id: 'vehicle',
      name: 'Vehicle',
      partitions: [
        { id: 'v1', label: 'Car', valid: true, value: 'Car', expected: '' },
        { id: 'v2', label: 'Truck', valid: false, value: 'Truck', expected: 'Not insurable' },
      ],
    },
  ],
}

describe('equivalence partitioning', () => {
  it('combines valid partitions and isolates each invalid one', () => {
    const r = designEP(model, 'en')
    expect(r.issues).toEqual([])
    // 2 valid cases (Age has 2 valid partitions) + 2 invalid cases.
    expect(r.cases.map((c) => c.inputs.map((i) => i.value))).toEqual([
      ['40', 'Car'],
      ['70', 'Car'],
      ['17', 'Car'],
      ['40', 'Truck'],
    ])
    expect(r.cases[2].expected).toBe('Under-age error')
    expect(coverageOf(r.items).percent).toBe(100)
  })

  it('reports partitions without a representative value as not covered', () => {
    const m = structuredClone(model)
    m.variables[0].partitions[2].value = ''
    const r = designEP(m, 'en')
    expect(r.issues.some((i) => i.level === 'warning')).toBe(true)
    expect(coverageOf(r.items)).toMatchObject({ covered: 4, total: 5 })
  })

  const arbModel = fc
    .array(
      fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }).filter((v) => v.includes(true)),
      { minLength: 1, maxLength: 5 },
    )
    .map(
      (vars): EpModel => ({
        title: '',
        validExpected: '',
        variables: vars.map((flags, vi) => ({
          id: `v${vi}`,
          name: `V${vi}`,
          partitions: flags.map((valid, pi) => ({ id: `v${vi}p${pi}`, label: `P${pi}`, valid, value: `x${vi}${pi}`, expected: '' })),
        })),
      }),
    )

  it('property: full coverage, one invalid input per invalid case, minimal valid cases', () => {
    fc.assert(
      fc.property(arbModel, (m) => {
        const r = designEP(m, 'en')
        expect(coverageOf(r.items).percent).toBe(100)
        for (const c of r.cases) {
          const invalid = c.inputs.filter((i) => i.kind === 'invalid').length
          expect(invalid).toBe(c.kind === 'invalid' ? 1 : 0)
        }
        const maxValid = Math.max(...m.variables.map((v) => v.partitions.filter((p) => p.valid).length))
        expect(r.cases.filter((c) => c.kind === 'valid')).toHaveLength(maxValid)
        const invalidParts = m.variables.flatMap((v) => v.partitions).filter((p) => !p.valid).length
        expect(r.cases.filter((c) => c.kind === 'invalid')).toHaveLength(invalidParts)
      }),
    )
  })
})
