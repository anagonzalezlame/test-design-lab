import { exampleModels } from '../data/examples'
import { designEP } from '../engine/ep'
import { designST } from '../engine/stateTransition'
import { csvField, exportFileName, toCsv, toGherkin, toMarkdown, toXrayCsv, type ExportCase } from './export'

const models = exampleModels('es')
const ep: ExportCase[] = designEP(models.ep, 'es').cases.map((testCase) => ({ technique: 'ep', feature: models.ep.title, testCase }))
const st: ExportCase[] = designST(models.st, 'es').cases.map((testCase) => ({ technique: 'st', feature: models.st.title, testCase }))

/** Minimal RFC 4180 parser, to check that our CSV round-trips. */
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (ch !== '\r') field += ch
  }
  return rows
}

describe('csv', () => {
  it('quotes only when needed', () => {
    expect(csvField('plain')).toBe('plain')
    expect(csvField('a,b')).toBe('"a,b"')
    expect(csvField('say "hi"')).toBe('"say ""hi"""')
    expect(csvField('two\nlines')).toBe('"two\nlines"')
    expect(csvField('a;b', ';')).toBe('"a;b"')
  })

  it('generic CSV has a BOM, one row per case and round-trips', () => {
    const csv = toCsv(ep, 'es')
    expect(csv.startsWith('﻿')).toBe(true)
    const rows = parseCsv(csv.slice(1), ',')
    expect(rows).toHaveLength(ep.length + 1)
    expect(rows[0][0]).toBe('ID')
    expect(rows[1][1]).toBe('Particiones de equivalencia')
    expect(rows[1][5]).toContain('Edad del conductor: 22')
  })
})

describe('xray csv', () => {
  const rows = parseCsv(toXrayCsv([...ep, ...st], 'es'), ';')

  it('uses the Test Case Importer layout', () => {
    expect(rows[0]).toEqual(['Issue Id', 'Test Type', 'Summary', 'Description', 'Labels', 'Action', 'Data', 'Result'])
    for (const r of rows.slice(1)) {
      expect(r).toHaveLength(8)
      expect(r[1]).toBe('Manual')
    }
  })

  it('writes one row per step and the summary only on the first row of each test', () => {
    const byId = new Map<string, string[][]>()
    for (const r of rows.slice(1)) byId.set(r[0], [...(byId.get(r[0]) ?? []), r])
    expect(byId.size).toBe(ep.length + st.length)
    for (const [, testRows] of byId) {
      expect(testRows[0][2]).not.toBe('')
      testRows.slice(1).forEach((r) => expect(r[2]).toBe(''))
    }
    const firstSt = byId.get(String(ep.length + 1))!
    expect(firstSt).toHaveLength(st[0].testCase.steps!.length)
    expect(firstSt[0][5]).toContain('Disparar')
  })
})

describe('markdown', () => {
  it('has one section per test item and escapes pipes', () => {
    const md = toMarkdown([...ep, ...st], 'es')
    expect(md).toContain('## Cotizador de seguro de auto')
    expect(md).toContain('## Inicio de sesión con bloqueo')
    const weird: ExportCase = { technique: 'ep', feature: 'X', testCase: { ...ep[0].testCase, expected: 'a | b' } }
    expect(toMarkdown([weird], 'es')).toContain('a \\| b')
  })
})

describe('gherkin', () => {
  it('data-driven cases become a Scenario Outline with an aligned Examples table', () => {
    const g = toGherkin(ep, 'es')
    expect(g.split('\n')[0]).toBe('# language: es')
    expect(g).toContain('Característica: Cotizador de seguro de auto')
    expect(g).toContain('Esquema del escenario: Particiones de equivalencia')
    expect(g).toContain('Dado que "Edad del conductor" es "<Edad del conductor>"')
    const table = g.split('\n').filter((l) => l.trim().startsWith('|'))
    expect(table).toHaveLength(ep.length + 1)
    expect(new Set(table.map((l) => l.length)).size).toBe(1) // aligned columns
  })

  it('path cases become scenarios with When/Then steps', () => {
    const g = toGherkin(st, 'en')
    expect(g.startsWith('# Technique')).toBe(true) // English needs no language header
    expect(g).toMatch(/Scenario: TC-01 /)
    expect(g).toContain('Given the system is in its initial state')
  })

  it('a mixed suite produces exactly one Feature', () => {
    const g = toGherkin([...ep, ...st], 'es', 'Suite de pruebas')
    expect(g.match(/^Característica:/gm)).toHaveLength(1)
    expect(g).toContain('Característica: Suite de pruebas')
    expect(g).toContain('Esquema del escenario: Cotizador de seguro de auto · Particiones de equivalencia')
  })
})

it('builds file names without accents or symbols', () => {
  expect(exportFileName('Inicio de sesión / bloqueo', 'feature')).toBe('inicio-de-sesion-bloqueo.feature')
  expect(exportFileName('Préstamos', 'xray')).toBe('prestamos-xray.csv')
  expect(exportFileName('', 'md')).toBe('test-cases.md')
})
