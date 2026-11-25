import { Check, CircleAlert, Info, ListPlus, TriangleAlert } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { coverageOf, type DesignResult, type Issue, type TestCase } from '../../engine/types'
import { useT } from '../../hooks/useT'
import type { TechniqueId } from '../../i18n/ui'
import { cn } from '../../lib/cn'
import { kindChip, kindDot } from '../../lib/kind'
import { useLab } from '../../store/labStore'
import { ExportMenu } from '../export/ExportMenu'
import { Button } from '../ui/Button'

const issueStyle: Record<Issue['level'], string> = {
  error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200',
  warning: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
  info: 'border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300',
}
const IssueIcon = { error: CircleAlert, warning: TriangleAlert, info: Info }

function Issues({ issues }: { issues: Issue[] }) {
  const t = useT()
  if (!issues.length) return null
  return (
    <ul className="space-y-2">
      {issues.map((issue, i) => {
        const Icon = IssueIcon[issue.level]
        return (
          <li key={i} className={cn('flex gap-2 rounded-md border px-3 py-2 text-sm', issueStyle[issue.level])}>
            <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="sr-only">{t.issues[issue.level]}: </span>
              {issue.message}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function CoverageMeter({ result }: { result: DesignResult }) {
  const t = useT()
  const c = coverageOf(result.items)
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{t.coverage}</span>
        <span className="font-mono">{c.percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={t.coverage}
        aria-valuenow={c.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
      >
        <div className="h-full rounded-full bg-neutral-900 transition-[width] duration-500 dark:bg-neutral-100" style={{ width: `${c.percent}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{t.coverageOf(c.covered, c.total)}</p>
    </div>
  )
}

function Section({ title, count, children, open = false }: { title: string; count: number; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold marker:hidden focus-visible:outline-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-neutral-100">
        <span>{title}</span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-xs dark:bg-neutral-800">{count}</span>
          <span aria-hidden="true" className="text-neutral-400 transition-transform group-open:rotate-90">›</span>
        </span>
      </summary>
      <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">{children}</div>
    </details>
  )
}

function CaseCard({ c }: { c: TestCase }) {
  const t = useT()
  return (
    <article className="space-y-2.5 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <header className="flex items-start gap-2">
        <span className="mt-0.5 font-mono text-xs text-neutral-500 dark:text-neutral-400">{c.id}</span>
        <h4 className="flex-1 text-sm font-medium">{c.title}</h4>
        {c.kind !== 'neutral' && (
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', kindChip[c.kind])}>{t.kinds[c.kind]}</span>
        )}
      </header>

      {c.steps ? (
        c.steps.length > 0 && (
          <ol className="list-decimal space-y-1 pl-5 text-sm marker:text-xs marker:text-neutral-400">
            {c.steps.map((s, i) => (
              <li key={i}>
                <span className={cn(s.kind === 'invalid' && 'font-medium text-red-800 dark:text-red-300')}>{s.action}</span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">{s.expected}</span>
              </li>
            ))}
          </ol>
        )
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {c.inputs.map((input, i) => (
            <li key={i} className={cn('rounded-md px-2 py-0.5 text-xs ring-1 ring-inset', kindChip[input.kind])}>
              <span className="opacity-70">{input.name}: </span>
              <span className="font-mono font-medium">{input.value}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm">
        <span className="text-neutral-500 dark:text-neutral-400">{t.expected}: </span>
        {c.expected}
      </p>
      <p className="font-mono text-[0.6875rem] text-neutral-400">
        {t.covers}: {c.covers.join(', ')}
      </p>
    </article>
  )
}

export function Results({ technique, result }: { technique: TechniqueId; result: DesignResult }) {
  const t = useT()
  const title = useLab((s) => s.models[technique].title)
  const feature = title.trim() || t.tech[technique].name
  const inSuite = useLab((s) => s.suite.some((i) => i.technique === technique && i.feature === feature))
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(''), 3500)
    return () => clearTimeout(timer)
  }, [status])

  const add = () => {
    useLab.getState().addToSuite(technique, feature, result.cases)
    setStatus(t.suite.added(result.cases.length))
  }

  return (
    <section aria-label={t.results} className="space-y-4">
      <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
        <CoverageMeter result={result} />
        <Issues issues={result.issues} />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm" onClick={add} disabled={!result.cases.length}>
            <ListPlus aria-hidden="true" className="size-3.5" />
            {inSuite ? t.suite.update(result.cases.length) : t.suite.add(result.cases.length)}
          </Button>
          <p role="status" aria-live="polite" className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
            {status && <Check aria-hidden="true" className="size-3.5" />}
            {status}
          </p>
        </div>
        <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <ExportMenu cases={result.cases.map((testCase) => ({ technique, feature, testCase }))} name={feature} />
        </div>
      </div>

      <Section title={t.conditions} count={result.conditions.length}>
        <ul className="space-y-1 text-sm">
          {result.conditions.map((c) => (
            <li key={c.id} className="flex gap-2">
              <span className="w-14 shrink-0 font-mono text-xs leading-5 text-neutral-400">{c.id}</span>
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t.items} count={result.items.length}>
        <ul className="space-y-1 text-sm">
          {result.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <span className="w-14 shrink-0 font-mono text-xs leading-5 text-neutral-400">{item.id}</span>
              <span aria-hidden="true" className={cn('mt-1.5 size-2 shrink-0 rounded-full', kindDot[item.kind])} />
              <span className="flex-1">{item.label}</span>
              {item.covered ? (
                <Check aria-label={t.covered} className="size-4 shrink-0 text-neutral-900 dark:text-neutral-100" />
              ) : (
                <span className="shrink-0 text-xs font-medium text-red-700 dark:text-red-400">{t.notCovered}</span>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t.cases} count={result.cases.length} open>
        {result.cases.length ? (
          <div className="space-y-2">
            {result.cases.map((c) => (
              <CaseCard key={c.id} c={c} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.noCases}</p>
        )}
      </Section>
    </section>
  )
}
