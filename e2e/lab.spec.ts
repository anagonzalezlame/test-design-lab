import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const TECHNIQUES = [
  'Particiones de equivalencia',
  'Análisis de valores límite',
  'Tablas de decisión',
  'Transición de estados',
  'Pruebas combinatorias',
]

const open = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Técnicas' }).getByRole('button', { name }).filter({ visible: true }).click()

async function download(page: Page, button: string) {
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: button }).filter({ visible: true }).first().click()])
  return { name: file.suggestedFilename(), text: await readFile((await file.path())!, 'utf8') }
}

test.describe('desktop', () => {
  test('every technique generates its example with full coverage, and the theory panel opens', async ({ page }) => {
    await page.goto('/')
    for (const name of TECHNIQUES) {
      await open(page, name)
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
      await expect(page.getByRole('progressbar', { name: 'Cobertura' })).toHaveAttribute('aria-valuenow', '100')
    }

    await page.getByRole('button', { name: 'Teoría y referencias' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('ISTQB CTAL-TA: combinatorial testing')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('exports Xray CSV and Gherkin for the current technique', async ({ page }) => {
    await page.goto('/')
    const xray = await download(page, 'Xray (CSV)')
    expect(xray.name).toBe('cotizador-de-seguro-de-auto-xray.csv')
    const lines = xray.text.trim().split(/\r\n/)
    expect(lines[0]).toBe('Issue Id;Test Type;Summary;Description;Labels;Action;Data;Result')
    expect(lines[1]).toMatch(/^1;Manual;Cotizador de seguro de auto · TC-01: /)

    const gherkin = await download(page, 'Gherkin')
    expect(gherkin.name).toBe('cotizador-de-seguro-de-auto.feature')
    expect(gherkin.text.split('\n')[0]).toBe('# language: es')
    expect(gherkin.text).toContain('Esquema del escenario: Particiones de equivalencia')
  })

  test('builds a suite from two techniques and exports it as a single Feature', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Agregar \d+ casos a la suite/ }).click()
    await open(page, 'Transición de estados')
    await page.getByRole('button', { name: /Agregar \d+ casos? a la suite/ }).click()

    const total = await page.evaluate(() => JSON.parse(localStorage.getItem('test-design-lab')!).state.suite.length)
    await page.getByRole('button', { name: `Suite (${total})` }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: /Particiones · Cotizador de seguro de auto/ })).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /Transición de estados · Inicio de sesión con bloqueo/ })).toBeVisible()

    const [file] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Gherkin' }).click()])
    expect(file.suggestedFilename()).toBe('suite-de-pruebas.feature')
    const text = await readFile((await file.path())!, 'utf8')
    expect(text.match(/^Característica:/gm)).toHaveLength(1)
    expect(text).toContain('Escenario: Inicio de sesión con bloqueo · TC-01')
  })

  test('keeps model changes after a reload', async ({ page }) => {
    await page.goto('/')
    await open(page, 'Análisis de valores límite')
    await page.getByRole('radio', { name: '3 valores' }).click()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Análisis de valores límite' })).toBeVisible()
    await expect(page.getByRole('radio', { name: '3 valores' })).toHaveAttribute('aria-checked', 'true')
  })
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true })

  test('no technique overflows the page horizontally', async ({ page }) => {
    await page.goto('/')
    const shorts = ['Particiones', 'Valores límite', 'Tablas de decisión', 'Transición de estados', 'Combinatoria']
    for (const name of shorts) {
      await open(page, name)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, name).toBe(0)
    }
  })
})
