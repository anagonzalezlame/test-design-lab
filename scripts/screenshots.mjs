// Regenerates the README screenshots. Serve the app first (npm run build && npm run preview).
// Usage: BASE_URL=http://localhost:4173 npm run screenshots
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173'
const OUT = process.env.OUT ?? 'docs/screenshots'
const browser = await chromium.launch()
await mkdir(OUT, { recursive: true })

async function shot(name, { technique, viewport = { width: 1600, height: 1000 }, colorScheme = 'light', locale = 'es-UY', fullPage = false, before }) {
  const context = await browser.newContext({ viewport, colorScheme, locale, deviceScaleFactor: 1.5 })
  const page = await context.newPage()
  await page.goto(BASE_URL)
  if (technique) await page.getByRole('button', { name: technique }).filter({ visible: true }).first().click()
  if (before) await before(page)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage })
  await context.close()
}

await shot('equivalence-partitioning', { technique: /Particiones|Partition/ })
await shot('state-transition', {
  technique: /Transición|State transition/,
  before: (page) => page.getByRole('heading', { name: /Diagrama de estados|State diagram/ }).scrollIntoViewIfNeeded(),
})
await shot('decision-table-dark', { technique: /Tablas de decisión|Decision table/, colorScheme: 'dark', locale: 'en-US' })
await shot('combinatorial', { technique: /combinatorias|Combinatorial/ })
await shot('theory', {
  technique: /valores límite|Boundary/i,
  before: (page) => page.getByRole('button', { name: /Teoría|Theory/ }).click(),
})
await shot('suite-export', {
  before: async (page) => {
    await page.getByRole('button', { name: /a la suite|to the suite/ }).click()
    await page.getByRole('button', { name: /^Suite/ }).click()
  },
})
await shot('mobile', { technique: /Valores límite|Boundary/, viewport: { width: 390, height: 844 } })

await browser.close()
console.log(`Screenshots saved in ${OUT}/`)
