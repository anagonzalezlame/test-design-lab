import { FlaskConical, ListChecks, Moon, Sun } from 'lucide-react'
import { useT } from '../../hooks/useT'
import { useLab } from '../../store/labStore'
import { Button, IconButton } from '../ui/Button'
import { LangSwitch } from '../ui/LangSwitch'

export function Header({ onOpenSuite }: { onOpenSuite: () => void }) {
  const t = useT()
  const uiLang = useLab((s) => s.uiLang)
  const theme = useLab((s) => s.theme)
  const count = useLab((s) => s.suite.length)
  const { setUiLang, toggleTheme } = useLab.getState()

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-neutral-50/85 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85">
      <div className="mx-auto flex h-14 max-w-[100rem] items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
            <FlaskConical aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">
              <span className="sm:hidden">{t.appShort}</span>
              <span className="hidden sm:inline">{t.appName}</span>
            </p>
            <p className="hidden truncate font-mono text-[0.6875rem] text-neutral-500 sm:block dark:text-neutral-400">{t.tagline}</p>
          </div>
        </div>
        <Button size="sm" onClick={onOpenSuite}>
          <ListChecks aria-hidden="true" className="size-3.5" />
          {t.suite.open(count)}
        </Button>
        <LangSwitch value={uiLang} onChange={setUiLang} label={t.uiLang} />
        <IconButton label={theme === 'dark' ? t.themeLight : t.themeDark} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </IconButton>
      </div>
    </header>
  )
}
