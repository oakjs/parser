import React from "react"

import { actions } from "~/app/actions"
import { UI } from "~/app/components/ui"
import { AppRoot } from "~/app/components/AppContainer"
import { ConsoleRoot } from "~/app/components/ConsoleViewer"
import { SpellPage } from "../components/SpellPage"
import { SplitPanel } from "~/app/components/SplitPanel"

/** Runner page. */
export const SpellRunner = React.memo(function SpellRunner() {
  store.projectPage = "runner"
  return (
    <SpellPage id="SpellRunner" fillWindow dark rows>
      <RunnerToolbar />
      <SplitPanel id="spellRunner" rows="85%" resizable rounded spaced="tightly">
        <AppRoot showToolbar={false} />
        <ConsoleRoot />
      </SplitPanel>
    </SpellPage>
  )
})
/** RunnerToolbar. */
export function RunnerToolbar() {
  return (
    <UI.AppMenu>
      <UI.Submenu left spring>
        <UI.ProjectDropdown useRunner />
        <actions.restartApp />
        <actions.showEditor />
      </UI.Submenu>
      <UI.Submenu center spring>
        <actions.showProjectChooser />
      </UI.Submenu>
      <UI.Submenu right spring>
        <actions.aboutSpell />
        <actions.showDocs />
        {/* <actions.showHelp /> */}
        {/* <actions.logIn /> */}
        <UI.MoreMenu stub />
      </UI.Submenu>
    </UI.AppMenu>
  )
}

/**
 * Reach-router `<Route/>` to show a project/example/etc by path.
 */
export function SpellRunnerRoute(props) {
  const { domain, project, filePath } = props
  const path = SpellLocation.pathForUrl({ domain, project, filePath })
  // console.info("SpellRunnerRoute", path, props)
  // HACK: Actually navigate on a timeout to avoid hook / rerender problems.
  setTimeout(() => store.selectPath(path), 0)
  return <SpellRunner />
}
