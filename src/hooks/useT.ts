import { ui } from '../i18n/ui'
import { useLab } from '../store/labStore'

export const useT = () => ui[useLab((s) => s.uiLang)]
