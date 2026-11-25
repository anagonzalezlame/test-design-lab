import type { Lang, TestCase } from '../engine/types'
import type { TechniqueId } from '../i18n/ui'

/** A test case together with where it came from. */
export interface ExportCase {
  technique: TechniqueId
  feature: string
  testCase: TestCase
}

interface Text {
  techniqueName: Record<TechniqueId, string>
  kind: Record<TestCase['kind'], string>
  csv: { id: string; technique: string; feature: string; title: string; kind: string; inputs: string; steps: string; expected: string; covers: string }
  md: { title: string; generated: (n: number) => string; id: string; case: string; inputs: string; expected: string; covers: string }
  gherkin: {
    header: string
    feature: string
    outline: string
    scenario: string
    examples: string
    given: string
    and: string
    when: string
    then: string
    technique: (name: string) => string
    inputIs: (name: string) => string
    process: string
    expectedIs: string
    caseCol: string
    expectedCol: string
    initial: string
  }
  xray: { action: string; standard: (technique: string, covers: string) => string }
}

const TEXT: Record<Lang, Text> = {
  es: {
    techniqueName: {
      ep: 'Particiones de equivalencia',
      bva: 'Análisis de valores límite',
      dt: 'Tablas de decisión',
      st: 'Transición de estados',
      cb: 'Pruebas combinatorias',
    },
    kind: { valid: 'Válido', invalid: 'Inválido', boundary: 'Límite', neutral: '' },
    csv: { id: 'ID', technique: 'Técnica', feature: 'Objeto de prueba', title: 'Título', kind: 'Tipo', inputs: 'Datos de entrada', steps: 'Pasos', expected: 'Resultado esperado', covers: 'Ítems de cobertura' },
    md: { title: 'Casos de prueba', generated: (n) => `${n} casos generados con el Laboratorio de Diseño de Pruebas.`, id: 'ID', case: 'Caso', inputs: 'Datos / pasos', expected: 'Resultado esperado', covers: 'Cubre' },
    gherkin: {
      header: '# language: es',
      feature: 'Característica',
      outline: 'Esquema del escenario',
      scenario: 'Escenario',
      examples: 'Ejemplos',
      given: 'Dado',
      and: 'Y',
      when: 'Cuando',
      then: 'Entonces',
      technique: (name) => `# Técnica: ${name} (ISO/IEC/IEEE 29119-4)`,
      inputIs: (name) => `que "${name}" es "<${name}>"`,
      process: 'se procesa la solicitud',
      expectedIs: 'el resultado es "<resultado esperado>"',
      caseCol: 'caso',
      expectedCol: 'resultado esperado',
      initial: 'que el sistema está en su estado inicial',
    },
    xray: {
      action: 'Ejecutar con los datos de prueba',
      standard: (technique, covers) => `Diseñado con ${technique} (ISO/IEC/IEEE 29119-4). Ítems de cobertura: ${covers}.`,
    },
  },
  en: {
    techniqueName: {
      ep: 'Equivalence partitioning',
      bva: 'Boundary value analysis',
      dt: 'Decision table testing',
      st: 'State transition testing',
      cb: 'Combinatorial testing',
    },
    kind: { valid: 'Valid', invalid: 'Invalid', boundary: 'Boundary', neutral: '' },
    csv: { id: 'ID', technique: 'Technique', feature: 'Test item', title: 'Title', kind: 'Type', inputs: 'Input data', steps: 'Steps', expected: 'Expected result', covers: 'Coverage items' },
    md: { title: 'Test cases', generated: (n) => `${n} cases generated with Test Design Lab.`, id: 'ID', case: 'Case', inputs: 'Data / steps', expected: 'Expected result', covers: 'Covers' },
    gherkin: {
      header: '',
      feature: 'Feature',
      outline: 'Scenario Outline',
      scenario: 'Scenario',
      examples: 'Examples',
      given: 'Given',
      and: 'And',
      when: 'When',
      then: 'Then',
      technique: (name) => `# Technique: ${name} (ISO/IEC/IEEE 29119-4)`,
      inputIs: (name) => `"${name}" is "<${name}>"`,
      process: 'the request is processed',
      expectedIs: 'the result is "<expected result>"',
      caseCol: 'case',
      expectedCol: 'expected result',
      initial: 'the system is in its initial state',
    },
    xray: {
      action: 'Run with the test data',
      standard: (technique, covers) => `Designed with ${technique} (ISO/IEC/IEEE 29119-4). Coverage items: ${covers}.`,
    },
  },
}

/** Groups cases by technique + test item, keeping their original order. */
export function groupCases(cases: ExportCase[]) {
  const groups: { technique: TechniqueId; feature: string; cases: TestCase[] }[] = []
  for (const c of cases) {
    const g = groups.find((x) => x.technique === c.technique && x.feature === c.feature)
    if (g) g.cases.push(c.testCase)
    else groups.push({ technique: c.technique, feature: c.feature, cases: [c.testCase] })
  }
  return groups
}

const inputsText = (tc: TestCase, sep: string) => tc.inputs.map((i) => `${i.name}: ${i.value}`).join(sep)
const stepsText = (tc: TestCase, sep: string) =>
  (tc.steps ?? []).map((s, i) => `${i + 1}. ${s.action} → ${s.expected}`).join(sep)

/* ---------------- CSV ---------------- */

/** RFC 4180 field: quoted when it contains the delimiter, quotes or line breaks. */
export function csvField(value: string, delimiter = ','): string {
  return value.includes(delimiter) || /["\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

const csvRow = (cells: string[], delimiter: string) => cells.map((c) => csvField(c, delimiter)).join(delimiter)

/** Generic CSV (Excel, TestRail, spreadsheets). UTF-8 BOM so Excel shows accents correctly. */
export function toCsv(cases: ExportCase[], lang: Lang): string {
  const t = TEXT[lang]
  const h = t.csv
  const rows = [
    [h.id, h.technique, h.feature, h.title, h.kind, h.inputs, h.steps, h.expected, h.covers],
    ...cases.map(({ technique, feature, testCase: tc }) => [
      tc.id,
      t.techniqueName[technique],
      feature,
      tc.title,
      t.kind[tc.kind],
      tc.steps ? '' : inputsText(tc, '\n'),
      stepsText(tc, '\n'),
      tc.expected,
      tc.covers.join(' '),
    ]),
  ]
  return '﻿' + rows.map((r) => csvRow(r, ',')).join('\r\n') + '\r\n'
}

/**
 * Xray Test Case Importer CSV (Cloud format; also importable in Server/DC by mapping the columns).
 * Delimiter ";". One row per step; rows of the same test share the Issue Id and only the first
 * row carries Summary, Description and Labels. Test Type is "Manual" on every row.
 */
export function toXrayCsv(cases: ExportCase[], lang: Lang): string {
  const t = TEXT[lang]
  const header = ['Issue Id', 'Test Type', 'Summary', 'Description', 'Labels', 'Action', 'Data', 'Result']
  const rows: string[][] = [header]
  cases.forEach(({ technique, feature, testCase: tc }, i) => {
    const issueId = String(i + 1)
    const summary = `${feature} · ${tc.id}: ${tc.title}`
    const description = t.xray.standard(t.techniqueName[technique], tc.covers.join(', '))
    const label = `test-design-lab-${technique}`
    const steps = tc.steps?.length
      ? tc.steps.map((s) => [s.action, '', s.expected])
      : [[t.xray.action, inputsText(tc, '\n'), tc.expected]]
    steps.forEach((step, si) => {
      rows.push(si === 0 ? [issueId, 'Manual', summary, description, label, ...step] : [issueId, 'Manual', '', '', '', ...step])
    })
  })
  return rows.map((r) => csvRow(r, ';')).join('\r\n') + '\r\n'
}

/* ---------------- Markdown ---------------- */

const mdCell = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')

export function toMarkdown(cases: ExportCase[], lang: Lang): string {
  const t = TEXT[lang]
  const out = [`# ${t.md.title}`, `_${t.md.generated(cases.length)}_`]
  for (const g of groupCases(cases)) {
    out.push(`## ${g.feature}`, `**${t.techniqueName[g.technique]}** · ISO/IEC/IEEE 29119-4`)
    const rows = g.cases.map((tc) => {
      const data = tc.steps ? stepsText(tc, '\n') : inputsText(tc, '\n')
      const title = tc.kind === 'neutral' ? tc.title : `${tc.title} (${t.kind[tc.kind]})`
      return `| ${tc.id} | ${mdCell(title)} | ${mdCell(data)} | ${mdCell(tc.expected)} | ${tc.covers.join(', ')} |`
    })
    out.push(
      [`| ${t.md.id} | ${t.md.case} | ${t.md.inputs} | ${t.md.expected} | ${t.md.covers} |`, '| --- | --- | --- | --- | --- |', ...rows].join('\n'),
    )
  }
  return out.join('\n\n') + '\n'
}

/* ---------------- Gherkin ---------------- */

const gCell = (s: string) => s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
const gText = (s: string) => s.replace(/\r?\n/g, ' ').trim()

/**
 * A .feature file holds exactly one Feature. With a single test item, it is the Feature; with
 * several (a mixed suite), they share one Feature and each group gets its own scenarios.
 * Data-driven cases (EP, BVA, DT, CB) become a Scenario Outline with an Examples table;
 * path-based cases (state transitions) become one Scenario each with When/Then steps.
 */
export function toGherkin(cases: ExportCase[], lang: Lang, suiteTitle = 'Test suite'): string {
  const g = TEXT[lang].gherkin
  const names = TEXT[lang].techniqueName
  const groups = groupCases(cases)
  const single = groups.length === 1
  const lines: string[] = []
  if (g.header) lines.push(g.header)
  if (single) lines.push(g.technique(names[groups[0].technique]))
  lines.push(`${g.feature}: ${gText(single ? groups[0].feature : suiteTitle)}`, '')

  for (const group of groups) {
    const prefix = single ? '' : `${gText(group.feature)} · `
    if (!single) lines.push(`  ${g.technique(names[group.technique])}`)

    const data = group.cases.filter((c) => !c.steps)
    const paths = group.cases.filter((c) => c.steps)

    if (data.length) {
      const columns = [...new Set(data.flatMap((c) => c.inputs.map((i) => i.name)))]
      lines.push(`  ${g.outline}: ${prefix}${gText(names[group.technique])}`)
      columns.forEach((col, i) => lines.push(`    ${i === 0 ? g.given : g.and} ${g.inputIs(gText(col))}`))
      lines.push(`    ${g.when} ${g.process}`, `    ${g.then} ${g.expectedIs}`, '', `    ${g.examples}:`)
      const header = [g.caseCol, ...columns.map(gText), g.expectedCol]
      const body = data.map((c) => [
        c.id,
        ...columns.map((col) => c.inputs.find((i) => i.name === col)?.value ?? ''),
        c.expected,
      ])
      const table = [header, ...body].map((r) => r.map(gCell))
      const widths = header.map((_, i) => Math.max(...table.map((r) => r[i].length)))
      for (const r of table) lines.push(`      | ${r.map((cell, i) => cell.padEnd(widths[i])).join(' | ')} |`)
      lines.push('')
    }

    for (const c of paths) {
      lines.push(`  ${g.scenario}: ${prefix}${c.id} ${gText(c.title)}`, `    ${g.given} ${g.initial}`)
      ;(c.steps ?? []).forEach((s, i) => {
        lines.push(`    ${i === 0 ? g.when : g.and} ${gText(s.action)}`, `    ${g.then} ${gText(s.expected)}`)
      })
      lines.push('')
    }
  }
  return lines.join('\n').trimEnd() + '\n'
}

/* ---------------- File names ---------------- */

export function exportFileName(feature: string, format: 'csv' | 'xray' | 'md' | 'feature'): string {
  const slug =
    feature
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'test-cases'
  return format === 'xray' ? `${slug}-xray.csv` : `${slug}.${format}`
}
