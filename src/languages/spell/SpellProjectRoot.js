import global from "global"

import { writeOnce, memoizeForProp, JSON5File, CONFIRM, $fetch, getDier } from "~/util"
import { SpellLocation, SpellProject } from "~/languages/spell"
import { spellSetup } from "./projectSetup"

/**
 * Loadable list of all `SpellProject`s available to this user.
 * NOTE: don't create these directly, use the ones set up by `SpellInstall`.
 */
export class SpellProjectRoot extends JSON5File {
  /**
   * Singleton instances
   */
  static get projects() {
    return new SpellProjectRoot("@user:projects")
  }
  static get examples() {
    return new SpellProjectRoot("@system:examples")
  }
  static get guides() {
    return new SpellProjectRoot("@system:guides")
  }

  /**
   * Return singleton root associated with `name` string.
   */
  static getRoot(name) {
    if (typeof name !== "string") return undefined
    if (name.startsWith("project")) return SpellProjectRoot.projects
    if (name.startsWith("examples")) return SpellProjectRoot.examples
    if (name.startsWith("guides")) return SpellProjectRoot.guides
  }

  // From `src/projectSetup.js`
  @writeOnce path
  @writeOnce owner
  @writeOnce domain
  @writeOnce label
  @writeOnce singular
  @writeOnce type
  @writeOnce description
  @writeOnce location

  /**
   * Given a `path` as `@user:projects` etc, return a singleton `SpellProjectRoot`
   * Throws if `path` is not in `spellSetup.projectRoots`.
   */
  /** Registry of known instances. */
  static registry = new Map()
  constructor(path, die) {
    // Return immediately from registry if already present.
    const existing = SpellProjectRoot.registry.get(path)
    if (existing) return existing

    const setup = spellSetup.projectRoots[path]
    if (!setup) {
      const message = `Invalid domain path '${path}'.`
      if (die) die(message)
      throw new TypeError(message)
    }
    super({ path, ...setup })
    this.location = new SpellLocation(this.path)
    SpellProjectRoot.registry.set(path, this)
  }

  /** URL to load the project list. */
  get url() {
    return `/api/projects/list/${this.path}`
  }

  /**
   * Load our index if necesssary, calling `die()` if something goes wrong.
   */
  async loadOrDie(die) {
    if (this.isLoaded) return
    try {
      this.load()
    } catch (e) {
      die("Error loading project list", e)
    }
  }

  /**
   * List of paths for all available `SpellProject`s.
   */
  @memoizeForProp("contents")
  get projectPaths() {
    // console.warn("setting projectPaths")
    // if (!this.isLoaded) console.warn("SpellProjectRoot(): Attempting to get list of projects before loading.")
    return this.contents || []
  }

  /**
   * Pointers to all available `SpellProject`s.
   * NOTE: this will throw if server sends invalid paths!!!
   *
   * TODOC: it's tricky to use this in a component!
   */
  @memoizeForProp("projectPaths")
  get projects() {
    // console.warn("setting projects")
    return this.projectPaths.map((path) => new SpellProject(path))
  }

  /**
   * Assuming we're loaded, return a known project by `path`.
   * Will return `undefined` if not found.
   */
  getProject(path) {
    return this.projects?.find((p) => p.path === path)
  }

  //-----------------
  //  Project CRUD
  //-----------------

  /**
   * Show `prompt()` to get new filename.
   * If you're basing off of a different project, pass its `projectId` (which MUST be valid!!!)
   * Returns `projectId` or `undefined`
   */
  promptForProjectId({ projectId, defaultName, message = `Name for the new ${this.type}?`, die } = {}) {
    const originalLocation = projectId && new SpellLocation(projectId, die)
    if (!defaultName) defaultName = originalLocation?.projectName || "Untitled"

    const projectName = prompt(message, defaultName)
    if (!projectName) return undefined
    const { owner, domain } = originalLocation || this
    return `${owner}:${domain}:${projectName}`
  }

  /**
   * Create a new project at `projectId`.
   * Returns new project, `undefined` if cancelled, or throws on error.
   */
  async createProject(projectId) {
    const die = getDier(this, `creating ${this.type}`, { projectId })

    if (!projectId) projectId = this.promptForProjectId({ die })
    if (!projectId) return undefined
    die.params.projectId = projectId

    const location = new SpellLocation(projectId, die)
    if (!location.isProjectPath) die("You must pass a projectId.")

    await this.loadOrDie(die)
    if (this.getProject(projectId)) die(`${this.Type} already exists.`)

    // Tell the server to create the project, which returns new projects list
    try {
      const newContents = await $fetch({
        url: `/api/projects/create/project`,
        contents: {
          projectId,
          filePath: "Untitled.spell",
          contents: "## this space intentionally left blank"
        },
        requestFormat: "json",
        format: "json"
      })
      this.setContents(newContents)
    } catch (e) {
      die(`Server error creating ${this.type}`, e)
    }
    // Return the new project
    return this.getProject(projectId) || die(`Server didn't create the new ${this.type}.`)
  }

  /**
   * Duplicate an existing project.
   * Returns new project, `undefined` if cancelled, or throws on error.
   */
  async duplicateApp(projectId, newProjectId) {
    const die = getDier(this, `duplicating ${this.type}`, { projectId, newProjectId })

    const location = new SpellLocation(projectId, die)

    await this.loadOrDie(die)
    const project = this.getProject(projectId) || die(`${this.Type} does not exist.`)

    if (!newProjectId) newProjectId = this.promptForProjectId({ projectId, die })
    if (!newProjectId) return undefined
    die.params.newProjectId = newProjectId

    const newLocation = new SpellLocation(newProjectId, die)
    if (!newLocation.isProjectPath) die("You must pass a newProjectId.")
    if (this.getProject(newProjectId)) die(`New ${this.type} already exists.`)

    // Tell the server to duplicate the project, which returns new projects list
    try {
      const newContents = await $fetch({
        url: `/api/projects/duplicate/project`,
        contents: { projectId, newProjectId },
        requestFormat: "json",
        format: "json"
      })
      this.setContents(newContents)
    } catch (e) {
      die(`Server error duplicating ${this.type}`, e)
    }
    // Return the new project
    return this.getProject(newProjectId) || die(`Couldn't create new ${this.type}`)
  }

  /**
   * Rename an existing project.
   * Returns new project, `undefined` if cancelled, or throws on error.
   */
  async renameApp(projectId, newProjectId) {
    const die = getDier(this, `renaming ${this.type}`, { projectId, newProjectId })

    const location = new SpellLocation(projectId, die)

    await this.loadOrDie(die)
    const project = this.getProject(projectId) || die(`${this.Type} does not exist.`)

    if (!newProjectId)
      newProjectId = this.promptForProjectId({ projectId, message: `New name for the ${this.type}?`, die })
    if (!newProjectId || newProjectId === projectId) return undefined
    die.params.newProjectId = newProjectId

    const newLocation = new SpellLocation(newProjectId, die)
    if (!newLocation.isProjectPath) die("You must pass a newProjectId.")
    if (this.getProject(newProjectId)) die(`New ${this.type} already exists.`)

    // Tell the server to duplicate the project, which returns new projects list
    try {
      const newContents = await $fetch({
        url: `/api/projects/rename/project`,
        contents: { projectId, newProjectId },
        requestFormat: "json",
        format: "json"
      })
      this.setContents(newContents)
      // Have the project clean itself up in a tick (delay is so React doesn't barf on hooks).
      setTimeout(() => project.onRemove(), 10)
    } catch (e) {
      die(`Server error renaming ${this.type}`, e)
    }

    // Return the new project
    return this.getProject(newProjectId) || die(`Server couldn't rename ${this.type}.`)
  }

  /**
   * Remove an existing project.
   * Returns `true` on success, `false` if cancelled, or throws on error.
   */
  async deleteApp(projectId, shouldConfirm) {
    const die = getDier(this, `removing ${this.type}`, { projectId })
    const location = new SpellLocation(projectId, die)

    await this.loadOrDie(die)
    const project = this.getProject(projectId) || die(`${this.Type} does not exist.`)

    if (shouldConfirm === CONFIRM) {
      if (!confirm(`Really remove ${this.type} '${project.projectName}'?`)) return false
    }

    // Tell the server to remove the project, which returns new projects list
    try {
      const newContents = await $fetch({
        url: `/api/projects/remove/project`,
        method: "DELETE",
        contents: { projectId },
        requestFormat: "json",
        format: "json"
      })
      this.setContents(newContents)
    } catch (e) {
      die(`Server error renaming ${this.type}`, e)
    }
    // Barf if the project still exists
    if (this.getProject(projectId)) die(`Server didn't delete ${this.type}.`)

    // Have the project clean itself up in a tick
    // (delay is so React doesn't barf on hooks).
    setTimeout(() => project.onRemove(), 10)
    return true
  }

  //-----------------
  //  Debug
  //-----------------
  toString() {
    return `${this.constructor.name}: ${this.path}`
  }
}

global.SpellProjectRoot = SpellProjectRoot
