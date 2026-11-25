import { useMemo } from 'react'
import type { Models } from '../data/examples'
import { designBVA } from '../engine/bva'
import { designCB } from '../engine/combinatorial'
import { designDT } from '../engine/decisionTable'
import { designEP } from '../engine/ep'
import { designST } from '../engine/stateTransition'
import type { DesignResult, Lang } from '../engine/types'
import type { TechniqueId } from '../i18n/ui'
import { useLab } from '../store/labStore'

export function runDesign(technique: TechniqueId, models: Models, lang: Lang): DesignResult {
  switch (technique) {
    case 'ep':
      return designEP(models.ep, lang)
    case 'bva':
      return designBVA(models.bva, lang)
    case 'dt':
      return designDT(models.dt, lang)
    case 'st':
      return designST(models.st, lang)
    case 'cb':
      return designCB(models.cb, lang)
  }
}

/** Runs the engine of a technique on its current model, in the UI language. */
export function useDesign(technique: TechniqueId): DesignResult {
  const models = useLab((s) => s.models)
  const lang = useLab((s) => s.uiLang)
  const model = models[technique]
  // Only recompute when this technique's model (or the language) changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => runDesign(technique, models, lang), [technique, model, lang])
}
