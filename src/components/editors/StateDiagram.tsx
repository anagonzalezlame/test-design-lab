import { useId } from 'react'
import { transitionName, type StModel } from '../../engine/stateTransition'

const W = 680
const H = 440
const NODE_W = 156
const NODE_H = 38

type P = { x: number; y: number }
const add = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y })
const scale = (a: P, k: number): P => ({ x: a.x * k, y: a.y * k })
const sub = (a: P, b: P): P => ({ x: a.x - b.x, y: a.y - b.y })
const norm = (a: P): P => {
  const l = Math.hypot(a.x, a.y) || 1
  return { x: a.x / l, y: a.y / l }
}
const perp = (a: P): P => ({ x: -a.y, y: a.x })

/** Point where the ray from the node centre towards `target` leaves the node rectangle. */
function clip(center: P, target: P): P {
  const d = sub(target, center)
  const k = Math.min(NODE_W / 2 / Math.abs(d.x || 1e-9), NODE_H / 2 / Math.abs(d.y || 1e-9))
  return add(center, scale(d, Math.min(k, 1)))
}

const truncate = (s: string, n = 20) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** Circular-layout state diagram drawn as plain SVG. */
export function StateDiagram({ model, label }: { model: StModel; label: string }) {
  const markerId = useId().replace(/:/g, '')
  const n = model.states.length
  if (!n) return null

  const center = { x: W / 2, y: H / 2 }
  const radius = n === 1 ? 0 : Math.min(W / 2 - NODE_W / 2 - 24, H / 2 - NODE_H - 34)
  const pos = new Map(
    model.states.map((s, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n
      return [s.id, { x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) }]
    }),
  )

  // Parallel edges between the same pair get increasing curvature.
  const seen = new Map<string, number>()

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full text-neutral-500 dark:text-neutral-400">
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fill-current" />
        </marker>
      </defs>

      {model.transitions.map((t, i) => {
        const a = pos.get(t.from)
        const b = pos.get(t.to)
        if (!a || !b) return null
        const name = transitionName(i)
        const title = `${name}: ${model.events.find((e) => e.id === t.event)?.name ?? '?'}${t.guard ? ` [${t.guard}]` : ''}${t.action ? ` / ${t.action}` : ''}`

        if (t.from === t.to) {
          const out = n === 1 ? { x: 0, y: -1 } : norm(sub(a, center))
          const side = perp(out)
          const k = seen.get(t.from + '>self') ?? 0
          seen.set(t.from + '>self', k + 1)
          const reach = 62 + k * 22
          const start = add(a, add(scale(out, NODE_H / 2), scale(side, 16)))
          const end = add(a, add(scale(out, NODE_H / 2), scale(side, -16)))
          const c1 = add(a, add(scale(out, reach), scale(side, 42)))
          const c2 = add(a, add(scale(out, reach), scale(side, -42)))
          const labelAt = add(a, scale(out, reach * 0.8 + 6))
          return (
            <g key={t.id}>
              <title>{title}</title>
              <path d={`M${start.x} ${start.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`} fill="none" stroke="currentColor" strokeWidth="1.4" markerEnd={`url(#${markerId})`} />
              <EdgeLabel at={labelAt} text={name} />
            </g>
          )
        }

        const key = `${t.from}>${t.to}`
        const k = seen.get(key) ?? 0
        seen.set(key, k + 1)
        const dir = norm(sub(b, a))
        const bend = 26 + k * 26
        const control = add(scale(add(a, b), 0.5), scale(perp(dir), bend))
        const start = clip(a, control)
        const end = clip(b, control)
        const mid = add(add(scale(start, 0.25), scale(control, 0.5)), scale(end, 0.25))
        return (
          <g key={t.id}>
            <title>{title}</title>
            <path d={`M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`} fill="none" stroke="currentColor" strokeWidth="1.4" markerEnd={`url(#${markerId})`} />
            <EdgeLabel at={mid} text={name} />
          </g>
        )
      })}

      {model.states.map((s) => {
        const p = pos.get(s.id)!
        const initial = s.id === model.initial
        const out = n === 1 ? { x: -1, y: 0 } : norm(sub(p, center))
        const dot = add(p, scale(out, 56))
        const tip = clip(p, dot)
        return (
          <g key={s.id}>
            <title>{s.name}</title>
            {initial && (
              <>
                <circle cx={dot.x} cy={dot.y} r="5" className="fill-neutral-900 dark:fill-neutral-100" />
                <line x1={dot.x} y1={dot.y} x2={tip.x} y2={tip.y} stroke="currentColor" strokeWidth="1.6" markerEnd={`url(#${markerId})`} />
              </>
            )}
            <rect
              x={p.x - NODE_W / 2}
              y={p.y - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              rx="10"
              strokeWidth={initial ? 2.2 : 1.2}
              className="fill-white stroke-neutral-900 dark:fill-neutral-900 dark:stroke-neutral-100"
            />
            <text x={p.x} y={p.y} dominantBaseline="central" textAnchor="middle" className="fill-neutral-900 text-[13px] font-medium dark:fill-neutral-100">
              {truncate(s.name)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function EdgeLabel({ at, text }: { at: P; text: string }) {
  return (
    <g>
      <rect x={at.x - 14} y={at.y - 9} width="28" height="18" rx="4" className="fill-neutral-50 dark:fill-neutral-950" />
      <text x={at.x} y={at.y} dominantBaseline="central" textAnchor="middle" className="fill-neutral-700 font-mono text-[11px] dark:fill-neutral-300">
        {text}
      </text>
    </g>
  )
}
