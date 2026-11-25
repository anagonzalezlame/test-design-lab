import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '../../hooks/useT'
import { downloadText } from '../../lib/download'
import { exportFileName, toCsv, toGherkin, toMarkdown, toXrayCsv, type ExportCase } from '../../lib/export'
import { useLab } from '../../store/labStore'
import { Button } from '../ui/Button'

type Format = 'xray' | 'csv' | 'md' | 'feature'

/** Download buttons for a set of cases; `name` is used for the file name. */
export function ExportMenu({ cases, name }: { cases: ExportCase[]; name: string }) {
  const t = useT()
  const lang = useLab((s) => s.uiLang)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(''), 4000)
    return () => clearTimeout(timer)
  }, [status])

  const run = (format: Format) => {
    const file = exportFileName(name, format)
    const text =
      format === 'xray'
        ? toXrayCsv(cases, lang)
        : format === 'csv'
          ? toCsv(cases, lang)
          : format === 'md'
            ? toMarkdown(cases, lang)
            : toGherkin(cases, lang, t.export.suiteTitle)
    downloadText(file, text)
    setStatus(t.export.downloaded(file))
  }

  const formats: { id: Format; label: string }[] = [
    { id: 'xray', label: t.export.xray },
    { id: 'csv', label: t.export.csv },
    { id: 'md', label: t.export.md },
    { id: 'feature', label: t.export.gherkin },
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{t.export.title}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t.export.title}>
        {formats.map((f) => (
          <Button key={f.id} size="sm" disabled={!cases.length} onClick={() => run(f.id)}>
            <Download aria-hidden="true" className="size-3.5" />
            {f.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.export.xrayHint}</p>
      <p role="status" aria-live="polite" className="min-h-4 text-xs text-neutral-700 dark:text-neutral-300">
        {status}
      </p>
    </div>
  )
}
