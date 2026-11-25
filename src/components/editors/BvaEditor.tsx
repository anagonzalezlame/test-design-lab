import { newId } from '../../data/examples'
import { decimalsOf, fromScaled, toScaled, type BvaModel, type BvaPartition } from '../../engine/bva'
import { useT } from '../../hooks/useT'
import { cn } from '../../lib/cn'
import { useLab } from '../../store/labStore'
import { AddButton, Block, CellInput, CheckCell, DenseTable, RemoveButton, Segmented } from '../ui/Compact'

/** Next partition starts right after the previous maximum (contiguous by construction). */
function nextMin(model: BvaModel): string {
  const last = model.partitions[model.partitions.length - 1]
  if (!last?.max.trim()) return ''
  const d = Math.max(decimalsOf(model.step), decimalsOf(last.max))
  const max = toScaled(last.max, d)
  const step = toScaled(model.step, d)
  return max !== null && step !== null ? fromScaled(max + step, d) : ''
}

function DomainBar({ model }: { model: BvaModel }) {
  const t = useT()
  if (!model.partitions.length) return null
  return (
    <figure aria-label={t.bva.domain} className="space-y-1">
      <div className="flex h-9 overflow-hidden rounded-md ring-1 ring-neutral-300 dark:ring-neutral-700">
        {model.partitions.map((p) => (
          <div
            key={p.id}
            title={`${p.label}: ${p.min || '−∞'} … ${p.max || '+∞'}`}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center border-r border-white px-1 text-xs font-medium last:border-0 dark:border-neutral-950',
              p.valid
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200'
                : 'bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200',
            )}
          >
            <span className="truncate">{p.label}</span>
          </div>
        ))}
      </div>
      <div className="flex font-mono text-[0.6875rem] text-neutral-500 dark:text-neutral-400">
        {model.partitions.map((p) => (
          <div key={p.id} className="flex min-w-0 flex-1 justify-between px-0.5">
            <span>{p.min || '−∞'}</span>
            <span>{p.max || '+∞'}</span>
          </div>
        ))}
      </div>
    </figure>
  )
}

export function BvaEditor() {
  const t = useT()
  const b = t.bva
  const model = useLab((s) => s.models.bva)
  const set = (m: BvaModel) => useLab.getState().setModel('bva', m)
  const setPart = (id: string, patch: Partial<BvaPartition>) =>
    set({ ...model, partitions: model.partitions.map((p) => (p.id === id ? { ...p, ...patch } : p)) })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{b.variable}</span>
          <CellInput value={model.variable} onChange={(e) => set({ ...model, variable: e.target.value })} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{b.step}</span>
          <CellInput value={model.step} inputMode="decimal" onChange={(e) => set({ ...model, step: e.target.value })} className="font-mono" aria-describedby="bva-step-hint" />
          <span id="bva-step-hint" className="block text-xs text-neutral-500 dark:text-neutral-400">{b.stepHint}</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">{b.variant}</span>
        <Segmented
          label={b.variant}
          value={model.variant}
          options={[
            { value: 2, label: b.two },
            { value: 3, label: b.three },
          ]}
          onChange={(variant) => set({ ...model, variant })}
        />
      </div>

      <Block
        title={b.partitions}
        actions={
          <AddButton onClick={() => set({ ...model, partitions: [...model.partitions, { id: newId(), label: '', min: nextMin(model), max: '', valid: true, expected: '' }] })}>
            {b.addPartition}
          </AddButton>
        }
      >
        <DomainBar model={model} />
        <DenseTable label={b.partitions}>
          <thead>
            <tr>
              <th>{b.label}</th>
              <th>{b.min}</th>
              <th>{b.max}</th>
              <th className="w-16 text-center">{b.valid}</th>
              <th>{b.expected}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {model.partitions.map((p, i) => (
              <tr key={p.id}>
                <td className="min-w-28">
                  <CellInput aria-label={`${b.label} ${i + 1}`} value={p.label} onChange={(e) => setPart(p.id, { label: e.target.value })} />
                </td>
                <td className="min-w-20">
                  <CellInput aria-label={`${b.min} (${p.label || i + 1})`} placeholder={i === 0 ? '−∞' : ''} value={p.min} inputMode="decimal" onChange={(e) => setPart(p.id, { min: e.target.value })} className="font-mono" />
                </td>
                <td className="min-w-20">
                  <CellInput aria-label={`${b.max} (${p.label || i + 1})`} placeholder={i === model.partitions.length - 1 ? '+∞' : ''} value={p.max} inputMode="decimal" onChange={(e) => setPart(p.id, { max: e.target.value })} className="font-mono" />
                </td>
                <td className="text-center">
                  <CheckCell label={`${b.valid} (${p.label || i + 1})`} checked={p.valid} onChange={(e) => setPart(p.id, { valid: e.target.checked })} />
                </td>
                <td className="min-w-40">
                  <CellInput aria-label={`${b.expected} (${p.label || i + 1})`} value={p.expected} onChange={(e) => setPart(p.id, { expected: e.target.value })} />
                </td>
                <td>
                  <RemoveButton label={`${t.remove}: ${p.label || i + 1}`} onClick={() => set({ ...model, partitions: model.partitions.filter((x) => x.id !== p.id) })} />
                </td>
              </tr>
            ))}
          </tbody>
        </DenseTable>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{b.unbounded}</p>
      </Block>
    </div>
  )
}
