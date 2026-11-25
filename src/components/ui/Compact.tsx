import { Plus, Trash2 } from 'lucide-react'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button, IconButton } from './Button'
import { inputClass } from './styles'

/** Small input for dense tables. */
export function CellInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClass, 'h-9 px-2.5 py-1', className)} {...props} />
}

export function CellSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(inputClass, 'h-9 px-2 py-1 pr-7', className)} {...props} />
}

export function CheckCell({ label, ...props }: ComponentProps<'input'> & { label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="size-4 accent-neutral-900 dark:accent-neutral-100"
      {...props}
    />
  )
}

/** Comma-separated values, committed on blur or Enter so typing a comma is never lost. */
export function ValuesInput({
  values,
  onChange,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & { values: string[]; onChange: (v: string[]) => void }) {
  const joined = values.join(', ')
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft === null) return
    const next = [...new Set(draft.split(',').map((s) => s.trim()).filter(Boolean))]
    onChange(next)
    setDraft(null)
  }
  return (
    <CellInput
      value={draft ?? joined}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        }
      }}
      className={className}
      {...props}
    />
  )
}

export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <IconButton label={label} onClick={onClick} className="size-8">
      <Trash2 className="size-4" />
    </IconButton>
  )
}

export function AddButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <Button size="sm" onClick={onClick}>
      <Plus aria-hidden="true" className="size-3.5" />
      {children}
    </Button>
  )
}

/** Two-to-four options as a segmented control (radio group). */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-md border border-neutral-300 p-0.5 dark:border-neutral-700">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-900 dark:focus-visible:outline-neutral-100',
            o.value === value
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Labelled block inside an editor. */
export function Block({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  )
}

/** Scrollable table wrapper with consistent header styling. */
export function DenseTable({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
      <table aria-label={label} className="w-full border-collapse text-left text-sm [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-middle [&_th]:px-2 [&_th]:py-2 [&_th]:text-xs [&_th]:font-medium [&_th]:whitespace-nowrap [&_th]:text-neutral-500 dark:[&_th]:text-neutral-400 [&_thead]:bg-neutral-50 dark:[&_thead]:bg-neutral-900 [&_tr]:border-b [&_tr]:border-neutral-200 [&_tr:last-child]:border-0 dark:[&_tr]:border-neutral-800">
        {children}
      </table>
    </div>
  )
}
