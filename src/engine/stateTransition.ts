import { markCovered, seqId, type CoverageItem, type DesignResult, type Issue, type Lang, type TestCase, type TestStep } from './types'

/**
 * State transition testing (ISO/IEC/IEEE 29119-4; ISTQB CTFL v4.0 §4.2.4).
 * Criteria:
 *  - states:      every state visited
 *  - transitions: every valid transition exercised (0-switch coverage)
 *  - all:         valid transitions + every invalid transition, one per test
 *  - switch1:     every pair of consecutive transitions (1-switch coverage)
 * Every test starts from the initial state.
 */

export type StCriterion = 'states' | 'transitions' | 'all' | 'switch1'

export interface StState {
  id: string
  name: string
}

export interface StEvent {
  id: string
  name: string
}

export interface StTransition {
  id: string
  from: string
  event: string
  guard: string
  to: string
  action: string
}

export interface StModel {
  title: string
  states: StState[]
  events: StEvent[]
  transitions: StTransition[]
  initial: string
  criterion: StCriterion
}

const M = {
  es: {
    empty: 'Agregá estados, eventos y al menos una transición, y elegí el estado inicial.',
    noInitial: 'Elegí el estado inicial.',
    dangling: (t: string) => `La transición ${t} usa un estado o evento que ya no existe.`,
    unreachable: (s: string) => `El estado «${s}» no es alcanzable desde el estado inicial.`,
    nondeterministic: (s: string, e: string) =>
      `En «${s}» el evento «${e}» tiene varias transiciones sin guardas que las distingan.`,
    uncoverable: (n: number) =>
      `${n} ${n === 1 ? 'ítem no se puede cubrir porque no es alcanzable' : 'ítems no se pueden cubrir porque no son alcanzables'} desde el estado inicial.`,
    condStates: 'Cada estado del modelo',
    condTransitions: 'Cada transición válida',
    condInvalid: 'Cada evento no permitido en cada estado (transición inválida)',
    condSwitch: 'Cada secuencia de dos transiciones consecutivas',
    itemState: (s: string) => `Estado «${s}»`,
    itemTransition: (t: string) => `Transición ${t}`,
    itemInvalid: (s: string, e: string) => `«${e}» en «${s}» (inválida)`,
    itemSwitch: (a: string, b: string) => `${a} → ${b}`,
    step: (e: string, guard: string, s: string) => `Disparar «${e}»${guard ? ` [${guard}]` : ''} en «${s}»`,
    goesTo: (s: string, action: string) => `Pasa a «${s}»${action ? ` / ${action}` : ''}`,
    rejected: (s: string) => `El evento se rechaza y el sistema permanece en «${s}»`,
    path: (states: string[]) => `Camino: ${states.join(' → ')}`,
    invalidCase: (e: string, s: string) => `Evento inválido «${e}» en «${s}»`,
    finalState: (s: string) => `Estado final: «${s}».`,
    initialOnly: (s: string) => `Verificar el estado inicial «${s}»`,
    event: (n: number) => `Evento ${n}`,
  },
  en: {
    empty: 'Add states, events and at least one transition, and choose the initial state.',
    noInitial: 'Choose the initial state.',
    dangling: (t: string) => `Transition ${t} uses a state or event that no longer exists.`,
    unreachable: (s: string) => `State “${s}” cannot be reached from the initial state.`,
    nondeterministic: (s: string, e: string) =>
      `In “${s}”, event “${e}” has several transitions without guards to tell them apart.`,
    uncoverable: (n: number) =>
      `${n} ${n === 1 ? 'item cannot be covered because it is' : 'items cannot be covered because they are'} unreachable from the initial state.`,
    condStates: 'Every state in the model',
    condTransitions: 'Every valid transition',
    condInvalid: 'Every event not allowed in each state (invalid transition)',
    condSwitch: 'Every sequence of two consecutive transitions',
    itemState: (s: string) => `State “${s}”`,
    itemTransition: (t: string) => `Transition ${t}`,
    itemInvalid: (s: string, e: string) => `“${e}” in “${s}” (invalid)`,
    itemSwitch: (a: string, b: string) => `${a} → ${b}`,
    step: (e: string, guard: string, s: string) => `Fire “${e}”${guard ? ` [${guard}]` : ''} in “${s}”`,
    goesTo: (s: string, action: string) => `Moves to “${s}”${action ? ` / ${action}` : ''}`,
    rejected: (s: string) => `The event is rejected and the system stays in “${s}”`,
    path: (states: string[]) => `Path: ${states.join(' → ')}`,
    invalidCase: (e: string, s: string) => `Invalid event “${e}” in “${s}”`,
    finalState: (s: string) => `Final state: “${s}”.`,
    initialOnly: (s: string) => `Check the initial state “${s}”`,
    event: (n: number) => `Event ${n}`,
  },
}

/** Human label for a transition: T1, T2… in model order. */
export const transitionName = (index: number) => `T${index + 1}`

export interface StateTableCell {
  state: string
  event: string
  transitions: StTransition[]
}

/** Full state table: every state × event, empty cells are invalid transitions. */
export function stateTable(model: StModel): StateTableCell[][] {
  return model.states.map((s) =>
    model.events.map((e) => ({
      state: s.id,
      event: e.id,
      transitions: model.transitions.filter((t) => t.from === s.id && t.event === e.id),
    })),
  )
}

/** Shortest path (BFS) from `start` to the first transition satisfying `goal`. */
function pathTo(
  model: StModel,
  start: string,
  goal: (t: StTransition) => boolean,
): StTransition[] | null {
  const prev = new Map<string, { via: StTransition; from: string } | null>([[start, null]])
  const queue = [start]
  while (queue.length) {
    const s = queue.shift()!
    for (const t of model.transitions.filter((x) => x.from === s)) {
      if (goal(t)) {
        const path = [t]
        let cur = s
        while (prev.get(cur)) {
          const p = prev.get(cur)!
          path.unshift(p.via)
          cur = p.from
        }
        return path
      }
      if (!prev.has(t.to)) {
        prev.set(t.to, { via: t, from: s })
        queue.push(t.to)
      }
    }
  }
  return null
}

function shortestPathToState(model: StModel, start: string, target: string): StTransition[] | null {
  if (start === target) return []
  return pathTo(model, start, (t) => t.to === target)
}

export function reachableStates(model: StModel): Set<string> {
  const seen = new Set([model.initial])
  const queue = [model.initial]
  while (queue.length) {
    const s = queue.shift()!
    for (const t of model.transitions) {
      if (t.from !== s || seen.has(t.to)) continue
      seen.add(t.to)
      queue.push(t.to)
    }
  }
  return seen
}

export function designST(model: StModel, lang: Lang): DesignResult {
  const m = M[lang]
  const empty = (level: Issue['level'], message: string): DesignResult => ({ conditions: [], items: [], cases: [], issues: [{ level, message }] })
  if (!model.states.length || !model.events.length || !model.transitions.length) return empty('info', m.empty)
  if (!model.states.some((s) => s.id === model.initial)) return empty('error', m.noInitial)

  const stateIds = new Set(model.states.map((s) => s.id))
  const eventIds = new Set(model.events.map((e) => e.id))
  const issues: Issue[] = []
  model.transitions.forEach((t, i) => {
    if (!stateIds.has(t.from) || !stateIds.has(t.to) || !eventIds.has(t.event))
      issues.push({ level: 'error', message: m.dangling(transitionName(i)) })
  })
  if (issues.length) return { conditions: [], items: [], cases: [], issues }

  const stateName = (id: string) => model.states.find((s) => s.id === id)!.name
  const eventName = (id: string) => model.events.find((e) => e.id === id)!.name
  const tName = (t: StTransition) => transitionName(model.transitions.indexOf(t))

  const reachable = reachableStates(model)
  model.states.forEach((s) => !reachable.has(s.id) && issues.push({ level: 'warning', message: m.unreachable(s.name) }))
  for (const row of stateTable(model))
    for (const cell of row)
      if (cell.transitions.length > 1 && new Set(cell.transitions.map((t) => t.guard.trim())).size < cell.transitions.length)
        issues.push({ level: 'warning', message: m.nondeterministic(stateName(cell.state), eventName(cell.event)) })

  const toStep = (t: StTransition): TestStep => ({
    action: m.step(eventName(t.event), t.guard.trim(), stateName(t.from)),
    expected: m.goesTo(stateName(t.to), t.action.trim()),
    kind: 'valid',
  })

  const pathCase = (path: StTransition[], covers: string[]): TestCase => {
    const visited = [model.initial, ...path.map((t) => t.to)].map(stateName)
    return {
      id: '',
      title: path.length ? m.path(visited) : m.initialOnly(stateName(model.initial)),
      inputs: path.map((t, i) => ({ name: m.event(i + 1), value: eventName(t.event), kind: 'valid' })),
      steps: path.map(toStep),
      expected: m.finalState(visited[visited.length - 1]),
      covers,
      kind: 'valid',
    }
  }

  const conditions: { id: string; label: string }[] = []
  const items: CoverageItem[] = []
  const cases: TestCase[] = []
  const addCondition = (label: string) => {
    const id = seqId('CON', conditions.length + 1)
    conditions.push({ id, label })
    return id
  }
  const addItem = (label: string, conditionId: string, kind: CoverageItem['kind'] = 'valid') => {
    const id = seqId('COV', items.length + 1)
    items.push({ id, label, kind, conditionId, covered: false })
    return id
  }

  /**
   * Greedy path builder: from the current state, walk the shortest path to the
   * nearest uncovered target; when nothing reachable is left, close the test.
   */
  const greedy = (
    targets: Map<string, string>, // key → coverage item id
    keysOf: (path: StTransition[]) => string[],
    goal: (t: StTransition, uncovered: Set<string>) => boolean,
  ) => {
    const before = cases.length
    const uncovered = new Set(targets.keys())
    for (const k of keysOf([])) uncovered.delete(k)
    while (uncovered.size) {
      const path: StTransition[] = []
      let cur = model.initial
      for (;;) {
        const step = pathTo(model, cur, (t) => goal(t, uncovered))
        if (!step) break
        path.push(...step)
        cur = path[path.length - 1].to
        for (const k of keysOf(path)) uncovered.delete(k)
        // Back at the initial state: close this test so cases stay short and readable.
        if (cur === model.initial) break
      }
      if (!path.length) break // the rest is unreachable
      cases.push(pathCase(path, [...new Set(keysOf(path).map((k) => targets.get(k)!))]))
    }
    // Items covered just by being in the initial state still need a test.
    if (cases.length === before && keysOf([]).length)
      cases.push(pathCase([], keysOf([]).map((k) => targets.get(k)!)))
  }

  if (model.criterion === 'states') {
    const cond = addCondition(m.condStates)
    const targets = new Map(model.states.map((s) => [s.id, addItem(m.itemState(s.name), cond)]))
    greedy(
      targets,
      (path) => [model.initial, ...path.map((t) => t.to)],
      (t, uncovered) => uncovered.has(t.to),
    )
  }

  if (model.criterion === 'transitions' || model.criterion === 'all') {
    const cond = addCondition(m.condTransitions)
    const targets = new Map(model.transitions.map((t, i) => [t.id, addItem(m.itemTransition(transitionName(i)), cond)]))
    greedy(
      targets,
      (path) => path.map((t) => t.id),
      (t, uncovered) => uncovered.has(t.id),
    )
  }

  if (model.criterion === 'all') {
    const cond = addCondition(m.condInvalid)
    for (const row of stateTable(model))
      for (const cell of row) {
        if (cell.transitions.length) continue
        const item = addItem(m.itemInvalid(stateName(cell.state), eventName(cell.event)), cond, 'invalid')
        const prefix = shortestPathToState(model, model.initial, cell.state)
        if (!prefix) continue
        const base = pathCase(prefix, [])
        cases.push({
          ...base,
          title: m.invalidCase(eventName(cell.event), stateName(cell.state)),
          inputs: [...base.inputs, { name: m.event(prefix.length + 1), value: eventName(cell.event), kind: 'invalid' }],
          steps: [
            ...(base.steps ?? []),
            { action: m.step(eventName(cell.event), '', stateName(cell.state)), expected: m.rejected(stateName(cell.state)), kind: 'invalid' },
          ],
          expected: m.finalState(stateName(cell.state)),
          covers: [item],
          kind: 'invalid',
        })
      }
  }

  if (model.criterion === 'switch1') {
    const cond = addCondition(m.condSwitch)
    const pairKey = (a: StTransition, b: StTransition) => `${a.id}>${b.id}`
    const targets = new Map<string, string>()
    for (const a of model.transitions)
      for (const b of model.transitions)
        if (a.to === b.from) targets.set(pairKey(a, b), addItem(m.itemSwitch(tName(a), tName(b)), cond))

    const keysOf = (path: StTransition[]) => path.slice(1).map((t, i) => pairKey(path[i], t))
    const uncovered = new Set(targets.keys())
    for (const [key] of targets) {
      if (!uncovered.has(key)) continue
      const [aId, bId] = key.split('>')
      const a = model.transitions.find((t) => t.id === aId)!
      const b = model.transitions.find((t) => t.id === bId)!
      const prefix = shortestPathToState(model, model.initial, a.from)
      if (!prefix) continue
      const path = [...prefix, a, b]
      // Keep extending while the last transition can be followed by an uncovered pair.
      for (;;) {
        const last = path[path.length - 1]
        const next = model.transitions.find((t) => t.from === last.to && uncovered.has(pairKey(last, t)) && !keysOf(path).includes(pairKey(last, t)))
        if (!next) break
        path.push(next)
      }
      keysOf(path).forEach((k) => uncovered.delete(k))
      cases.push(pathCase(path, [...new Set(keysOf(path).map((k) => targets.get(k)!))]))
    }
  }

  cases.forEach((c, i) => (c.id = seqId('TC', i + 1)))
  const final = markCovered(items, cases)
  const missing = final.filter((i) => !i.covered).length
  if (missing) issues.push({ level: 'warning', message: m.uncoverable(missing) })
  return { conditions, items: final, cases, issues }
}
