import { Maximize2, Minimize2, Sparkles, X } from 'lucide-react'
import { newId } from '../../data/examples'
import { analyzeTable, DASH, expandRule, minimizeRules, missingRules, ruleName, type DtModel, type DtRule } from '../../engine/decisionTable'
import { useT } from '../../hooks/useT'
import { useLab } from '../../store/labStore'
import { Button, IconButton } from '../ui/Button'
import { AddButton, Block, CellInput, CellSelect, CheckCell, DenseTable, RemoveButton, ValuesInput } from '../ui/Compact'

export function DtEditor() {
  const t = useT()
  const d = t.dt
  const model = useLab((s) => s.models.dt)
  const set = (m: DtModel) => useLab.getState().setModel('dt', m)
  const setRule = (id: string, patch: Partial<DtRule>) =>
    set({ ...model, rules: model.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) })

  const analysis = analyzeTable(model)
  const canMinimize = model.rules.length > 0 && analysis.contradictions.length === 0

  const expand = () =>
    set({
      ...model,
      rules: model.rules.flatMap((r) =>
        expandRule(r, model.conditions).map((combo) => ({
          ...r,
          id: newId(),
          entries: Object.fromEntries(model.conditions.map((c, i) => [c.id, combo[i]])),
        })),
      ),
    })

  return (
    <div className="space-y-6">
      <div className="grid gap-6 @3xl:grid-cols-2 [&>*]:min-w-0">
        <Block
          title={d.conditions}
          actions={
            <AddButton onClick={() => set({ ...model, conditions: [...model.conditions, { id: newId(), name: `${d.condition} ${model.conditions.length + 1}`, values: ['T', 'F'] }] })}>
              {d.addCondition}
            </AddButton>
          }
        >
          <ul className="space-y-2">
            {model.conditions.map((c, i) => (
              <li key={c.id} className="grid grid-cols-[1fr_8rem_auto] items-center gap-2">
                <CellInput aria-label={`${d.condition} ${i + 1}`} value={c.name} onChange={(e) => set({ ...model, conditions: model.conditions.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) })} />
                <ValuesInput
                  aria-label={`${d.values} · ${c.name}`}
                  title={t.valuesHint}
                  values={c.values}
                  onChange={(values) => set({ ...model, conditions: model.conditions.map((x) => (x.id === c.id ? { ...x, values } : x)) })}
                  className="font-mono"
                />
                <RemoveButton
                  label={`${t.remove}: ${c.name}`}
                  onClick={() =>
                    set({
                      ...model,
                      conditions: model.conditions.filter((x) => x.id !== c.id),
                      rules: model.rules.map((r) => {
                        const entries = { ...r.entries }
                        delete entries[c.id]
                        return { ...r, entries }
                      }),
                    })
                  }
                />
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.valuesHint}</p>
        </Block>

        <Block title={d.actions} actions={<AddButton onClick={() => set({ ...model, actions: [...model.actions, { id: newId(), name: `${d.action} ${model.actions.length + 1}` }] })}>{d.addAction}</AddButton>}>
          <ul className="space-y-2">
            {model.actions.map((a, i) => (
              <li key={a.id} className="flex items-center gap-2">
                <CellInput aria-label={`${d.action} ${i + 1}`} value={a.name} onChange={(e) => set({ ...model, actions: model.actions.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)) })} />
                <RemoveButton
                  label={`${t.remove}: ${a.name}`}
                  onClick={() => set({ ...model, actions: model.actions.filter((x) => x.id !== a.id), rules: model.rules.map((r) => ({ ...r, actions: r.actions.filter((id) => id !== a.id) })) })}
                />
              </li>
            ))}
          </ul>
        </Block>
      </div>

      <Block
        title={d.rules}
        actions={
          <div className="flex flex-wrap gap-2">
            <AddButton onClick={() => set({ ...model, rules: [...model.rules, { id: newId(), entries: {}, actions: [], feasible: true }] })}>{d.addRule}</AddButton>
            <Button size="sm" disabled={!analysis.missing.length} onClick={() => set({ ...model, rules: [...model.rules, ...missingRules(model, newId)] })}>
              <Sparkles aria-hidden="true" className="size-3.5" />
              {d.complete}
            </Button>
            <Button size="sm" disabled={!canMinimize} title={canMinimize ? undefined : d.minimizeBlocked} onClick={() => set({ ...model, rules: minimizeRules(model, newId) })}>
              <Minimize2 aria-hidden="true" className="size-3.5" />
              {d.minimize}
            </Button>
            <Button size="sm" disabled={!model.rules.length} onClick={expand}>
              <Maximize2 aria-hidden="true" className="size-3.5" />
              {d.expand}
            </Button>
          </div>
        }
      >
        <DenseTable label={d.rules}>
          <thead>
            <tr>
              <th className="sticky left-0 bg-neutral-50 dark:bg-neutral-900" />
              {model.rules.map((r, i) => (
                <th key={r.id} className="text-center">
                  <span className="inline-flex items-center gap-0.5 font-mono">
                    {ruleName(i)}
                    <IconButton label={`${t.remove}: ${ruleName(i)}`} onClick={() => set({ ...model, rules: model.rules.filter((x) => x.id !== r.id) })} className="size-6">
                      <X className="size-3" />
                    </IconButton>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.conditions.map((c) => (
              <tr key={c.id}>
                <th scope="row" className="sticky left-0 max-w-48 truncate bg-white text-left dark:bg-neutral-950">{c.name}</th>
                {model.rules.map((r, i) => (
                  <td key={r.id} className="text-center">
                    <CellSelect
                      aria-label={`${ruleName(i)} · ${c.name}`}
                      value={r.entries[c.id] ?? DASH}
                      onChange={(e) => setRule(r.id, { entries: { ...r.entries, [c.id]: e.target.value } })}
                      className="w-auto min-w-24 font-mono"
                    >
                      {c.values.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                      <option value={DASH}>{d.dash}</option>
                    </CellSelect>
                  </td>
                ))}
              </tr>
            ))}
            {model.actions.map((a) => (
              <tr key={a.id} className="bg-neutral-50/60 dark:bg-neutral-900/40">
                <th scope="row" className="sticky left-0 max-w-48 truncate bg-neutral-50 text-left dark:bg-neutral-900">{a.name}</th>
                {model.rules.map((r, i) => (
                  <td key={r.id} className="text-center">
                    <CheckCell
                      label={`${ruleName(i)} · ${a.name}`}
                      checked={r.actions.includes(a.id)}
                      onChange={(e) => setRule(r.id, { actions: e.target.checked ? [...r.actions, a.id] : r.actions.filter((x) => x !== a.id) })}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row" className="sticky left-0 bg-white text-left dark:bg-neutral-950">{d.feasible}</th>
              {model.rules.map((r, i) => (
                <td key={r.id} className="text-center">
                  <CheckCell label={`${ruleName(i)} · ${d.feasible}`} checked={r.feasible} onChange={(e) => setRule(r.id, { feasible: e.target.checked })} />
                </td>
              ))}
            </tr>
          </tbody>
        </DenseTable>
      </Block>
    </div>
  )
}
