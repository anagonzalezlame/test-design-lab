import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { exampleModels } from './data/examples'
import { useLab } from './store/labStore'

beforeEach(() => {
  localStorage.clear()
  useLab.setState({ ...useLab.getInitialState(), uiLang: 'es', models: exampleModels('es'), suite: [], technique: 'ep' }, true)
})

const coverage = () => screen.getByRole('progressbar', { name: 'Cobertura' })

describe('lab', () => {
  it('shows every technique with its example fully covered', async () => {
    const user = userEvent.setup()
    render(<App />)
    const nav = screen.getAllByRole('navigation', { name: 'Técnicas' })[0]
    for (const name of ['Particiones de equivalencia', 'Análisis de valores límite', 'Tablas de decisión', 'Transición de estados', 'Pruebas combinatorias']) {
      await user.click(within(nav).getByRole('button', { name }))
      expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument()
      expect(coverage()).toHaveAttribute('aria-valuenow', '100')
    }
  })

  it('regenerates the design when the model changes (BVA 2 → 3 values)', async () => {
    const user = userEvent.setup()
    useLab.setState({ technique: 'bva' })
    render(<App />)
    const casesBefore = screen.getAllByRole('article').length
    await user.click(screen.getByRole('radio', { name: '3 valores' }))
    expect(screen.getAllByRole('article').length).toBeGreaterThan(casesBefore)
    expect(useLab.getState().models.bva.variant).toBe(3)
  })

  it('flags a contradiction in a decision table', async () => {
    const user = userEvent.setup()
    useLab.setState({ technique: 'dt' })
    render(<App />)
    // R4 (No, -, -) → change "Cliente registrado" to "Sí" so it overlaps R1–R3 with other actions.
    await user.selectOptions(screen.getByRole('combobox', { name: 'R4 · Cliente registrado' }), 'Sí')
    expect(screen.getAllByText(/Contradicción/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Minimizar tabla/ })).toBeDisabled()
  })

  it('adds the generated cases to the suite and replaces them on update', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Agregar \d+ casos a la suite/ }))
    const n = useLab.getState().suite.length
    expect(n).toBeGreaterThan(0)
    expect(screen.getByText(`${n} casos agregados a la suite.`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Actualizar en la suite/ }))
    expect(useLab.getState().suite).toHaveLength(n)
    expect(screen.getByRole('button', { name: `Suite (${n})` })).toBeInTheDocument()
  })

  it('switches the interface to English', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('radio', { name: 'English' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Equivalence partitioning' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Coverage' })).toBeInTheDocument()
  })
})
