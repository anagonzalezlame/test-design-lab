import { BookOpen, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useState, type ComponentType } from 'react'
import { useDesign } from '../../hooks/useDesign'
import { useT } from '../../hooks/useT'
import type { TechniqueId } from '../../i18n/ui'
import { cn } from '../../lib/cn'
import { useLab } from '../../store/labStore'
import { BvaEditor } from '../editors/BvaEditor'
import { CbEditor } from '../editors/CbEditor'
import { DtEditor } from '../editors/DtEditor'
import { EpEditor } from '../editors/EpEditor'
import { StEditor } from '../editors/StEditor'
import { Results } from '../results/Results'
import { Button } from '../ui/Button'
import { CellInput } from '../ui/Compact'
import { Drawer } from '../ui/Drawer'

/** Techniques whose editor is a wide table: results go below instead of beside it. */
const WIDE_EDITORS: TechniqueId[] = ['dt', 'st']

const EDITORS: Record<TechniqueId, ComponentType> = {
  ep: EpEditor,
  bva: BvaEditor,
  dt: DtEditor,
  st: StEditor,
  cb: CbEditor,
}

function TheoryContent({ technique }: { technique: TechniqueId }) {
  const t = useT()
  const th = t.tech[technique].theory
  const list = (items: string[], ordered = false) => {
    const Tag = ordered ? 'ol' : 'ul'
    return (
      <Tag className={`${ordered ? 'list-decimal' : 'list-disc'} space-y-1.5 pl-5 marker:text-neutral-400`}>
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </Tag>
    )
  }
  const labels = t.theoryLabels
  return (
    <div className="space-y-6 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
      <p>{th.definition}</p>
      <section className="space-y-2">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{labels.steps}</h3>
        {list(th.steps, true)}
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{labels.coverage}</h3>
        {list(th.coverage)}
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{labels.pitfalls}</h3>
        {list(th.pitfalls)}
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{labels.references}</h3>
        <ul className="space-y-1 font-mono text-xs">
          {th.references.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{labels.disclaimer}</p>
      </section>
    </div>
  )
}

export function TechniquePage({ technique }: { technique: TechniqueId }) {
  const t = useT()
  const info = t.tech[technique]
  const result = useDesign(technique)
  const title = useLab((s) => s.models[technique].title)
  const [theory, setTheory] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const Editor = EDITORS[technique]

  useEffect(() => {
    if (!confirmClear) return
    const timer = setTimeout(() => setConfirmClear(false), 3500)
    return () => clearTimeout(timer)
  }, [confirmClear])

  const setTitle = (value: string) => useLab.getState().setTitle(technique, value)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">{info.name}</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{info.when}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setTheory(true)}>
            <BookOpen aria-hidden="true" className="size-3.5" />
            {t.theory}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => useLab.getState().loadExample(technique)}>
            <Sparkles aria-hidden="true" className="size-3.5" />
            {t.loadExample}
          </Button>
          <Button
            size="sm"
            variant={confirmClear ? 'primary' : 'ghost'}
            onClick={() => {
              if (confirmClear) {
                useLab.getState().clearModel(technique)
                setConfirmClear(false)
              } else setConfirmClear(true)
            }}
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            {confirmClear ? t.clearConfirm : t.clear}
          </Button>
        </div>
      </header>

      <div className={cn('grid gap-6', !WIDE_EDITORS.includes(technique) && '2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]')}>
        <section aria-label={t.model} className="@container min-w-0 space-y-5 rounded-lg border border-neutral-200 bg-white p-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900/60">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">{t.model}</h2>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t.modelTitle}</span>
            <CellInput value={title} onChange={(e) => setTitle(e.target.value)} aria-describedby={`${technique}-title-hint`} />
            <span id={`${technique}-title-hint`} className="block text-xs text-neutral-500 dark:text-neutral-400">
              {t.modelTitleHint}
            </span>
          </label>
          <Editor />
        </section>

        <div className={cn('min-w-0', !WIDE_EDITORS.includes(technique) && '2xl:sticky 2xl:top-20 2xl:max-h-[calc(100dvh-6rem)] 2xl:self-start 2xl:overflow-y-auto')}>
          <h2 className="sr-only">{t.results}</h2>
          <Results technique={technique} result={result} />
        </div>
      </div>

      <Drawer open={theory} onClose={() => setTheory(false)} title={`${info.name}: ${t.theory.toLowerCase()}`} closeLabel={t.close}>
        <TheoryContent technique={technique} />
      </Drawer>
    </div>
  )
}
