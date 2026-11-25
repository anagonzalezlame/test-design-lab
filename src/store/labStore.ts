import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { emptyModels, exampleModels, newId, type Models } from '../data/examples'
import type { Lang, TestCase } from '../engine/types'
import type { TechniqueId } from '../i18n/ui'

type Theme = 'light' | 'dark'

export interface SuiteItem {
  id: string
  technique: TechniqueId
  /** Test item (model title) the case was designed for. */
  feature: string
  testCase: TestCase
}

export interface LabState {
  technique: TechniqueId
  uiLang: Lang
  theme: Theme
  models: Models
  suite: SuiteItem[]

  setTechnique: (t: TechniqueId) => void
  setModel: <K extends TechniqueId>(k: K, model: Models[K]) => void
  setTitle: (k: TechniqueId, title: string) => void
  loadExample: (k: TechniqueId) => void
  clearModel: (k: TechniqueId) => void
  /** Replaces the cases previously added from the same technique and test item. */
  addToSuite: (technique: TechniqueId, feature: string, cases: TestCase[]) => void
  removeFromSuite: (technique: TechniqueId, feature: string) => void
  clearSuite: () => void
  setUiLang: (lang: Lang) => void
  toggleTheme: () => void
}

const initialLang = (): Lang =>
  typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es'

const initialTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export const useLab = create<LabState>()(
  persist(
    (set) => ({
      technique: 'ep',
      uiLang: initialLang(),
      theme: initialTheme(),
      models: exampleModels(initialLang()),
      suite: [],

      setTechnique: (technique) => set({ technique }),
      setModel: (k, model) => set((s) => ({ models: { ...s.models, [k]: model } })),
      setTitle: (k, title) => set((s) => ({ models: { ...s.models, [k]: { ...s.models[k], title } } })),
      loadExample: (k) => set((s) => ({ models: { ...s.models, [k]: exampleModels(s.uiLang)[k] } })),
      clearModel: (k) => set((s) => ({ models: { ...s.models, [k]: emptyModels()[k] } })),
      addToSuite: (technique, feature, cases) =>
        set((s) => ({
          suite: [
            ...s.suite.filter((i) => !(i.technique === technique && i.feature === feature)),
            ...cases.map((testCase) => ({ id: newId(), technique, feature, testCase })),
          ],
        })),
      removeFromSuite: (technique, feature) =>
        set((s) => ({ suite: s.suite.filter((i) => !(i.technique === technique && i.feature === feature)) })),
      clearSuite: () => set({ suite: [] }),
      setUiLang: (uiLang) => set({ uiLang }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'test-design-lab',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ technique, uiLang, theme, models, suite }) => ({ technique, uiLang, theme, models, suite }),
    },
  ),
)
