import { newId } from '../../data/examples'
import type { EpModel, EpPartition, EpVariable } from '../../engine/ep'
import { useT } from '../../hooks/useT'
import { useLab } from '../../store/labStore'
import { AddButton, Block, CellInput, CheckCell, DenseTable, RemoveButton } from '../ui/Compact'

export function EpEditor() {
  const t = useT()
  const e = t.ep
  const model = useLab((s) => s.models.ep)
  const set = (m: EpModel) => useLab.getState().setModel('ep', m)
  const setVar = (id: string, patch: Partial<EpVariable>) =>
    set({ ...model, variables: model.variables.map((v) => (v.id === id ? { ...v, ...patch } : v)) })
  const setPart = (v: EpVariable, pid: string, patch: Partial<EpPartition>) =>
    setVar(v.id, { partitions: v.partitions.map((p) => (p.id === pid ? { ...p, ...patch } : p)) })

  return (
    <div className="space-y-6">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{e.validExpected}</span>
        <CellInput value={model.validExpected} onChange={(ev) => set({ ...model, validExpected: ev.target.value })} />
      </label>

      <Block
        title={e.variables}
        actions={
          <AddButton
            onClick={() =>
              set({
                ...model,
                variables: [
                  ...model.variables,
                  { id: newId(), name: `${e.variable} ${model.variables.length + 1}`, partitions: [{ id: newId(), label: '', valid: true, value: '', expected: '' }] },
                ],
              })
            }
          >
            {e.addVariable}
          </AddButton>
        }
      >
        {model.variables.map((v) => (
          <div key={v.id} className="space-y-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <CellInput
                aria-label={e.variable}
                value={v.name}
                onChange={(ev) => setVar(v.id, { name: ev.target.value })}
                className="font-medium"
              />
              <RemoveButton label={`${t.remove}: ${v.name}`} onClick={() => set({ ...model, variables: model.variables.filter((x) => x.id !== v.id) })} />
            </div>
            <DenseTable label={`${e.partition} · ${v.name}`}>
              <thead>
                <tr>
                  <th>{e.partition}</th>
                  <th className="w-16 text-center">{e.valid}</th>
                  <th>{e.value}</th>
                  <th>{e.expected}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {v.partitions.map((p, i) => (
                  <tr key={p.id}>
                    <td className="min-w-32">
                      <CellInput aria-label={`${e.partition} ${i + 1}`} value={p.label} onChange={(ev) => setPart(v, p.id, { label: ev.target.value })} />
                    </td>
                    <td className="text-center">
                      <CheckCell label={`${e.valid} (${p.label || i + 1})`} checked={p.valid} onChange={(ev) => setPart(v, p.id, { valid: ev.target.checked })} />
                    </td>
                    <td className="min-w-28">
                      <CellInput aria-label={`${e.value} (${p.label || i + 1})`} value={p.value} onChange={(ev) => setPart(v, p.id, { value: ev.target.value })} className="font-mono" />
                    </td>
                    <td className="min-w-40">
                      <CellInput
                        aria-label={`${e.expected} (${p.label || i + 1})`}
                        value={p.expected}
                        disabled={p.valid}
                        onChange={(ev) => setPart(v, p.id, { expected: ev.target.value })}
                        className="disabled:opacity-40"
                      />
                    </td>
                    <td>
                      <RemoveButton label={`${t.remove}: ${p.label || i + 1}`} onClick={() => setVar(v.id, { partitions: v.partitions.filter((x) => x.id !== p.id) })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DenseTable>
            <AddButton onClick={() => setVar(v.id, { partitions: [...v.partitions, { id: newId(), label: '', valid: false, value: '', expected: '' }] })}>
              {e.addPartition}
            </AddButton>
          </div>
        ))}
      </Block>
    </div>
  )
}
