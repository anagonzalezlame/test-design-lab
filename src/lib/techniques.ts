import { Grid3x3, Ruler, Shapes, Table2, Workflow, type LucideIcon } from 'lucide-react'
import type { TechniqueId } from '../i18n/ui'

export const TECHNIQUES: { id: TechniqueId; icon: LucideIcon }[] = [
  { id: 'ep', icon: Shapes },
  { id: 'bva', icon: Ruler },
  { id: 'dt', icon: Table2 },
  { id: 'st', icon: Workflow },
  { id: 'cb', icon: Grid3x3 },
]
