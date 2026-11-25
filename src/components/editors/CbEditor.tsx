import { X } from 'lucide-react'
import { newId } from '../../data/examples'
import type { CbConstraint, CbModel, CbParam, CbStrategy } from '../../engine/combinatorial'
import { useT } from '../../hooks/useT'
import { useLab } from '../../store/labStore'
import { IconButton } from '../ui/Button'
import { AddButton, Block, CellInput, CellSelect, DenseTable, RemoveButton, Segmented, ValuesInput } from '../ui/Compact'

export function CbEditor() {
  const t = useT()
  const c = t.cb
  const model = useLab((s) => s.models.cb)
  const set = (m: CbModel) => useLab.getState().setModel('cb', m)
  const setParam = (id: string, patch: Partial<CbParam>) =>
    set({ ...model, params: model.params.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  const setConstraint = (id: string, patch: Partial<CbConstraint>) =>
    set({ ...model, constraints: model.constraints.map((k) => (k.id === id ? { ...k, ...patch } : k)) })

  const total = model.params.reduce((n, p) => n * Math.max(p.values.length, 1), model.params.length ? 1 : 0)
  const strategies: CbStrategy[] = ['pairwise', 'each', 'base']
  const showBase = model.strategy === 'base'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">{c.strategy}</span>
        <Segmented label={c.strategy} value={model.strategy} options={strategies.map((s) => ({ value: s, label: c.strategies[s] }))} onChange={(strategy) => set({ ...model, strategy })} />
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{c.total(total)}</span>
      </div>

      <Block
        title={c.params}
        actions={<AddButton onClick={() => set({ ...model, params: [...model.params, { id: newId(), name: `${c.param} ${model.params.length + 1}`, values: ['A', 'B'], base: 0 }] })}>{c.addParam}</AddButton>}
      >
        <DenseTable label={c.params}>
          <thead>
            <tr>
              <th>{c.param}</th>
              <th>
                {c.values} <span className="font-normal">({t.valuesHint.toLowerCase()})</span>
              </th>
              {showBase && <th>{c.base}</th>}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {model.params.map((p, i) => (
              <tr key={p.id}>
                <td className="min-w-36">
                  <CellInput aria-label={`${c.param} ${i + 1}`} value={p.name} onChange={(e) => setParam(p.id, { name: e.target.value })} />
                </td>
                <td className="min-w-52">
                  <ValuesInput aria-label={`${c.values} · ${p.name}`} values={p.values} onChange={(values) => setParam(p.id, { values, base: Math.min(p.base, Math.max(values.length - 1, 0)) })} />
                </td>
                {showBase && (
                  <td className="min-w-32">
                    <CellSelect aria-label={`${c.base} · ${p.name}`} value={p.base} onChange={(e) => setParam(p.id, { base: Number(e.target.value) })}>
                      {p.values.map((v, vi) => (
                        <option key={v} value={vi}>
                          {v}
                        </option>
                      ))}
                    </CellSelect>
                  </td>
                )}
                <td>
                  <RemoveButton
                    label={`${t.remove}: ${p.name}`}
                    onClick={() =>
                      set({
                        ...model,
                        params: model.params.filter((x) => x.id !== p.id),
                        constraints: model.constraints
                          .map((k) => ({ ...k, entries: k.entries.filter((e) => e.param !== p.id) }))
                          .filter((k) => k.entries.length),
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </DenseTable>
      </Block>

      <Block
        title={c.constraints}
        actions={
          <AddButton
            onClick={() => {
              const [a, b] = model.params
              const entries = [a, b].filter(Boolean).map((p) => ({ param: p.id, value: p.values[0] ?? '' }))
              set({ ...model, constraints: [...model.constraints, { id: newId(), entries }] })
            }}
          >
            {c.addConstraint}
          </AddButton>
        }
      >
        <ul className="space-y-2">
          {model.constraints.map((k, ki) => (
            <li key={k.id} className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 p-2 dark:border-neutral-800">
              <span className="font-mono text-xs text-neutral-500">#{ki + 1}</span>
              {k.entries.map((entry, ei) => {
                const param = model.params.find((p) => p.id === entry.param)
                return (
                  <span key={ei} className="flex items-center gap-1">
                    {ei > 0 && <span className="px-1 text-xs text-neutral-500">{c.and}</span>}
                    <CellSelect
                      aria-label={`${c.constraint} ${ki + 1} · ${c.param} ${ei + 1}`}
                      value={entry.param}
                      onChange={(e) => {
                        const p = model.params.find((x) => x.id === e.target.value)
                        const entries = k.entries.map((x, xi) => (xi === ei ? { param: e.target.value, value: p?.values[0] ?? '' } : x))
                        setConstraint(k.id, { entries })
                      }}
                      className="w-auto"
                    >
                      {model.params.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </CellSelect>
                    <span aria-hidden="true">=</span>
                    <CellSelect
                      aria-label={`${c.constraint} ${ki + 1} · ${c.values} ${ei + 1}`}
                      value={entry.value}
                      onChange={(e) => setConstraint(k.id, { entries: k.entries.map((x, xi) => (xi === ei ? { ...x, value: e.target.value } : x)) })}
                      className="w-auto"
                    >
                      {(param?.values ?? []).map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </CellSelect>
                    {k.entries.length > 1 && (
                      <IconButton label={`${t.remove}: ${param?.name ?? ''}`} onClick={() => setConstraint(k.id, { entries: k.entries.filter((_, xi) => xi !== ei) })} className="size-7">
                        <X className="size-3.5" />
                      </IconButton>
                    )}
                  </span>
                )
              })}
              <span className="ml-auto flex items-center gap-1">
                <AddButton
                  onClick={() => {
                    const used = new Set(k.entries.map((e) => e.param))
                    const p = model.params.find((x) => !used.has(x.id))
                    if (p) setConstraint(k.id, { entries: [...k.entries, { param: p.id, value: p.values[0] ?? '' }] })
                  }}
                >
                  {c.addEntry}
                </AddButton>
                <RemoveButton label={`${t.remove}: ${c.constraint} ${ki + 1}`} onClick={() => set({ ...model, constraints: model.constraints.filter((x) => x.id !== k.id) })} />
              </span>
            </li>
          ))}
        </ul>
      </Block>
    </div>
  )
}
