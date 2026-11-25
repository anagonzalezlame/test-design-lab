import type { TechniqueId } from '../i18n/ui'
import type { SuiteItem } from '../store/labStore'

export interface SuiteGroup {
  technique: TechniqueId
  feature: string
  items: SuiteItem[]
}

export function groupSuite(suite: SuiteItem[]): SuiteGroup[] {
  const groups: SuiteGroup[] = []
  for (const item of suite) {
    const g = groups.find((x) => x.technique === item.technique && x.feature === item.feature)
    if (g) g.items.push(item)
    else groups.push({ technique: item.technique, feature: item.feature, items: [item] })
  }
  return groups
}
