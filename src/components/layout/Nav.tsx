import { useT } from '../../hooks/useT'
import { cn } from '../../lib/cn'
import { TECHNIQUES } from '../../lib/techniques'
import { useLab } from '../../store/labStore'


const focus = 'focus-visible:outline-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-neutral-100'

export function SideNav() {
  const t = useT()
  const current = useLab((s) => s.technique)
  return (
    <nav aria-label={t.techniques}>
      <p className="mb-2 px-2.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">{t.techniques}</p>
      <ul className="space-y-1">
        {TECHNIQUES.map(({ id, icon: Icon }) => {
          const active = id === current
          return (
            <li key={id}>
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => useLab.getState().setTechnique(id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
                  focus,
                  active ? 'bg-white shadow-xs ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800' : 'hover:bg-neutral-100 dark:hover:bg-neutral-900/60',
                )}
              >
                <Icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', active ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400')} />
                <span className="min-w-0">
                  <span className={cn('block text-sm', active ? 'font-semibold' : 'font-medium text-neutral-700 dark:text-neutral-300')}>{t.tech[id].name}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Horizontal technique switcher for small screens. */
export function TopNav() {
  const t = useT()
  const current = useLab((s) => s.technique)
  return (
    <nav aria-label={t.techniques} className="-mx-4 overflow-x-auto px-4 lg:hidden">
      <ul className="flex gap-1.5 pb-1">
        {TECHNIQUES.map(({ id, icon: Icon }) => {
          const active = id === current
          return (
            <li key={id} className="shrink-0">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => useLab.getState().setTechnique(id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                  focus,
                  active
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                    : 'border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300',
                )}
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {t.tech[id].short}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
