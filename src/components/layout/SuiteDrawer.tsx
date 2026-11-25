import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '../../hooks/useT'
import { groupSuite } from '../../lib/suite'
import { useLab } from '../../store/labStore'
import { ExportMenu } from '../export/ExportMenu'
import { Button } from '../ui/Button'
import { RemoveButton } from '../ui/Compact'
import { Drawer } from '../ui/Drawer'

export function SuiteDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const suite = useLab((s) => s.suite)
  const groups = groupSuite(suite)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (!confirm) return
    const timer = setTimeout(() => setConfirm(false), 3500)
    return () => clearTimeout(timer)
  }, [confirm])

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t.suite.open(suite.length)}
      closeLabel={t.close}
      footer={
        suite.length > 0 && (
          <Button
            size="sm"
            variant={confirm ? 'primary' : 'ghost'}
            onClick={() => {
              if (confirm) {
                useLab.getState().clearSuite()
                setConfirm(false)
              } else setConfirm(true)
            }}
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
            {confirm ? t.clearConfirm : t.suite.clear}
          </Button>
        )
      }
    >
      {suite.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.suite.empty}</p>
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            <ExportMenu cases={suite} name={t.export.suiteTitle} />
          </div>
          {groups.map((g) => (
            <section key={`${g.technique}|${g.feature}`} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t.suite.group(t.tech[g.technique].short, g.feature, g.items.length)}</h3>
                <RemoveButton label={`${t.suite.remove}: ${g.feature}`} onClick={() => useLab.getState().removeFromSuite(g.technique, g.feature)} />
              </div>
              <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
                {g.items.map((i) => (
                  <li key={i.id} className="flex gap-2 px-3 py-2">
                    <span className="w-12 shrink-0 font-mono text-xs leading-5 text-neutral-400">{i.testCase.id}</span>
                    <span className="min-w-0 flex-1 truncate">{i.testCase.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.suite.snapshot}</p>
        </div>
      )}
    </Drawer>
  )
}
