import { newId } from '../../data/examples'
import { stateTable, transitionName, type StCriterion, type StModel, type StTransition } from '../../engine/stateTransition'
import { useT } from '../../hooks/useT'
import { useLab } from '../../store/labStore'
import { AddButton, Block, CellInput, CellSelect, DenseTable, RemoveButton, Segmented } from '../ui/Compact'
import { StateDiagram } from './StateDiagram'

export function StEditor() {
  const t = useT()
  const s = t.st
  const model = useLab((st) => st.models.st)
  const set = (m: StModel) => useLab.getState().setModel('st', m)
  const setTransition = (id: string, patch: Partial<StTransition>) =>
    set({ ...model, transitions: model.transitions.map((x) => (x.id === id ? { ...x, ...patch } : x)) })
  const stateName = (id: string) => model.states.find((x) => x.id === id)?.name ?? '?'

  const criteria: StCriterion[] = ['states', 'transitions', 'all', 'switch1']

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">{s.criterion}</span>
        <Segmented label={s.criterion} value={model.criterion} options={criteria.map((c) => ({ value: c, label: s.criteria[c] }))} onChange={(criterion) => set({ ...model, criterion })} />
      </div>

      <div className="grid gap-6 @3xl:grid-cols-2 [&>*]:min-w-0">
        <Block
          title={s.states}
          actions={
            <AddButton
              onClick={() => {
                const id = newId()
                set({ ...model, states: [...model.states, { id, name: `${s.state} ${model.states.length + 1}` }], initial: model.initial || id })
              }}
            >
              {s.addState}
            </AddButton>
          }
        >
          <ul className="space-y-2">
            {model.states.map((st, i) => (
              <li key={st.id} className="flex items-center gap-2">
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300" title={s.initial}>
                  <input type="radio" name="initial-state" checked={model.initial === st.id} onChange={() => set({ ...model, initial: st.id })} className="accent-neutral-900 dark:accent-neutral-100" aria-label={`${s.initial}: ${st.name}`} />
                </label>
                <CellInput aria-label={`${s.state} ${i + 1}`} value={st.name} onChange={(e) => set({ ...model, states: model.states.map((x) => (x.id === st.id ? { ...x, name: e.target.value } : x)) })} />
                <RemoveButton
                  label={`${t.remove}: ${st.name}`}
                  onClick={() =>
                    set({
                      ...model,
                      states: model.states.filter((x) => x.id !== st.id),
                      transitions: model.transitions.filter((x) => x.from !== st.id && x.to !== st.id),
                      initial: model.initial === st.id ? (model.states.find((x) => x.id !== st.id)?.id ?? '') : model.initial,
                    })
                  }
                />
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">◉ = {s.initial}</p>
        </Block>

        <Block title={s.events} actions={<AddButton onClick={() => set({ ...model, events: [...model.events, { id: newId(), name: `${s.event} ${model.events.length + 1}` }] })}>{s.addEvent}</AddButton>}>
          <ul className="space-y-2">
            {model.events.map((ev, i) => (
              <li key={ev.id} className="flex items-center gap-2">
                <CellInput aria-label={`${s.event} ${i + 1}`} value={ev.name} onChange={(e) => set({ ...model, events: model.events.map((x) => (x.id === ev.id ? { ...x, name: e.target.value } : x)) })} />
                <RemoveButton
                  label={`${t.remove}: ${ev.name}`}
                  onClick={() => set({ ...model, events: model.events.filter((x) => x.id !== ev.id), transitions: model.transitions.filter((x) => x.event !== ev.id) })}
                />
              </li>
            ))}
          </ul>
        </Block>
      </div>

      <Block
        title={s.transitions}
        actions={
          <AddButton
            onClick={() =>
              set({
                ...model,
                transitions: [
                  ...model.transitions,
                  { id: newId(), from: model.states[0]?.id ?? '', event: model.events[0]?.id ?? '', guard: '', to: model.states[0]?.id ?? '', action: '' },
                ],
              })
            }
          >
            {s.addTransition}
          </AddButton>
        }
      >
        <DenseTable label={s.transitions}>
          <thead>
            <tr>
              <th className="w-10">ID</th>
              <th>{s.from}</th>
              <th>{s.event}</th>
              <th>{s.guard}</th>
              <th>{s.to}</th>
              <th>{s.action}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {model.transitions.map((tr, i) => {
              const name = transitionName(i)
              return (
                <tr key={tr.id}>
                  <td className="font-mono text-xs text-neutral-500">{name}</td>
                  <td className="min-w-32">
                    <CellSelect aria-label={`${name} · ${s.from}`} value={tr.from} onChange={(e) => setTransition(tr.id, { from: e.target.value })}>
                      {model.states.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </CellSelect>
                  </td>
                  <td className="min-w-32">
                    <CellSelect aria-label={`${name} · ${s.event}`} value={tr.event} onChange={(e) => setTransition(tr.id, { event: e.target.value })}>
                      {model.events.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </CellSelect>
                  </td>
                  <td className="min-w-24">
                    <CellInput aria-label={`${name} · ${s.guard}`} value={tr.guard} onChange={(e) => setTransition(tr.id, { guard: e.target.value })} />
                  </td>
                  <td className="min-w-32">
                    <CellSelect aria-label={`${name} · ${s.to}`} value={tr.to} onChange={(e) => setTransition(tr.id, { to: e.target.value })}>
                      {model.states.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </CellSelect>
                  </td>
                  <td className="min-w-28">
                    <CellInput aria-label={`${name} · ${s.action}`} value={tr.action} onChange={(e) => setTransition(tr.id, { action: e.target.value })} />
                  </td>
                  <td>
                    <RemoveButton label={`${t.remove}: ${name}`} onClick={() => set({ ...model, transitions: model.transitions.filter((x) => x.id !== tr.id) })} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </DenseTable>
      </Block>

      {model.states.length > 0 && (
        <div className="grid gap-6 @4xl:grid-cols-2 [&>*]:min-w-0">
          <Block title={s.diagram}>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950">
              <StateDiagram model={model} label={s.diagram} />
            </div>
          </Block>
          <Block title={s.table}>
            <DenseTable label={s.table}>
              <thead>
                <tr>
                  <th />
                  {model.events.map((e) => (
                    <th key={e.id}>{e.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stateTable(model).map((row, i) => (
                  <tr key={model.states[i].id}>
                    <th scope="row" className="text-left whitespace-nowrap">
                      {model.states[i].name}
                    </th>
                    {row.map((cell) => (
                      <td key={cell.event} className={cell.transitions.length ? 'text-xs' : 'bg-red-50/70 text-center text-red-700 dark:bg-red-500/10 dark:text-red-300'}>
                        {cell.transitions.length
                          ? cell.transitions.map((tr) => (
                              <span key={tr.id} className="block whitespace-nowrap">
                                <span className="font-mono text-neutral-400">{transitionName(model.transitions.indexOf(tr))}</span> → {stateName(tr.to)}
                                {tr.guard && <span className="text-neutral-500"> [{tr.guard}]</span>}
                              </span>
                            ))
                          : s.invalidCell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </DenseTable>
          </Block>
        </div>
      )}
    </div>
  )
}
