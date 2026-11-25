import { useEffect, useState } from 'react'
import { Header } from './components/layout/Header'
import { SideNav, TopNav } from './components/layout/Nav'
import { SuiteDrawer } from './components/layout/SuiteDrawer'
import { TechniquePage } from './components/layout/TechniquePage'
import { useT } from './hooks/useT'
import { useLab } from './store/labStore'

export default function App() {
  const t = useT()
  const technique = useLab((s) => s.technique)
  const theme = useLab((s) => s.theme)
  const uiLang = useLab((s) => s.uiLang)
  const [suiteOpen, setSuiteOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = uiLang
    document.title = t.appName
  }, [uiLang, t.appName])

  return (
    <>
      <Header onOpenSuite={() => setSuiteOpen(true)} />
      <div className="mx-auto grid max-w-[100rem] gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:py-8">
        <aside className="hidden lg:block">
          <div className="sticky top-22">
            <SideNav />
          </div>
        </aside>
        <main className="min-w-0 space-y-5">
          <TopNav />
          <TechniquePage key={technique} technique={technique} />
        </main>
      </div>
      <SuiteDrawer open={suiteOpen} onClose={() => setSuiteOpen(false)} />
    </>
  )
}
