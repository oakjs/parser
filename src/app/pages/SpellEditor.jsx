import React from "react"
import { useHotkeys } from "react-hotkeys-hook"

import { actions } from "~/app/actions"
import { UI } from "~/app/components/ui"
import { AppRoot } from "~/app/components/AppContainer"
import { ASTRoot } from "~/app/components/ASTViewer"
import { ConsoleRoot } from "~/app/components/ConsoleViewer"
import { InputRoot } from "~/app/components/InputEditor"
import { MatchRoot } from "~/app/components/MatchViewer"
// import { ProjectSettings } from "./ProjectSettings"
import { SpellPage } from "../components/SpellPage"
import { SplitPanel, SplitPane } from "~/app/components/SplitPanel"
import { store } from "~/app/store"

/**
 * <SpellEditor />
 * Note that this does not need to be a `view()`,
 * it redraws automatically when the file changes.
 */
export const SpellEditor = React.memo(function SpellEditor() {
  store.projectPage = "editor"
  // Set up hotkey when NOT in codemirror
  // Note these are duplicated in CodeMirror.js
  useHotkeys("command+s", (event) => {
    event.preventDefault()
    store.saveFile()
  })
  useHotkeys("shift-command+r", () => store.reloadFile())
  useHotkeys("command+enter", () => store.compileApp())
  useHotkeys("command+n", (event) => {
    event.preventDefault()
    store.createFile()
  })

  return (
    <>
      <SpellPage id="SpellEditor" fillWindow dark rows>
        <EditorToolbar />
        <SplitPanel id="spellEditor-columns" columns resizable fluid spaced="tightly">
          <SplitPanel id="spellEditor-left" rows="85%" resizable rounded>
            <InputRoot />
            {/* <SplitPane scrolling light>
              <ProjectSettings />
            </SplitPane> */}
            <ConsoleRoot />
          </SplitPanel>
          <SplitPanel id="spellEditor-right" rows="60%" resizable rounded>
            <AppRoot />
            <ASTRoot />
            <MatchRoot />
          </SplitPanel>
        </SplitPanel>
      </SpellPage>
    </>
  )
})

export function EditorToolbar() {
  // console.info("EditorToolbar", { file, fileIsDirty })
  return (
    <UI.AppMenu>
      <UI.Submenu left spring>
        <UI.ProjectDropdown />
        <actions.showRunner />
        <actions.showProjectSettings />
        <UI.ProjectActionsDropdown />
      </UI.Submenu>
      <UI.Submenu center spring>
        <actions.showProjectChooser />
      </UI.Submenu>
      <UI.Submenu right spring>
        <actions.aboutSpell />
        {/* <actions.showHelp /> */}
        <actions.showDocs />
        <UI.MoreMenu stub />
      </UI.Submenu>
    </UI.AppMenu>
  )
}

/**
 * Reach-router `<Route/>` to show a project/example/etc by path.
 * Note that this will redraw the editor every time the route changes.
 */
export function SpellEditorRoute(props) {
  const { domain, project, filePath } = props
  const path = SpellLocation.pathForUrl({ domain, project, filePath })
  // console.info("SpellRoute", path, props)
  // HACK: Actually navigate on a timeout to avoid hook / rerender problems.
  setTimeout(() => store.selectPath(path), 0)
  return <SpellEditor />
}
