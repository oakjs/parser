import { TextFile, proto, memoize, forward, writeOnce, overridable, state } from "~/util"
import { Token } from "~/parser"
import { SpellLocation, SpellProject } from "~/languages/spell"
import { batch } from "~/util"

/**
 * CSS file as part of SpellProject.
 *
 * Note that these are singleton instances --
 * you'll always get the same object back for a given `path`.
 */
export class SpellCSSFile extends TextFile {
  /** Registry of known instances. */
  static registry = new Map()
  constructor(path) {
    // Return immediately from registry if already present.
    const existing = SpellCSSFile.registry.get(path)
    if (existing) return existing

    super({ path })
    if (!this.location.isFilePath) {
      throw new TypeError(`new SpellCSSFile('${path}'): Must be initialized with valid file path.`)
    }
    SpellCSSFile.registry.set(path, this)
  }

  /** We've been removed from the server -- clean up memory, etc.. */
  onRemove() {
    super.onRemove()
    SpellCSSFile.registry.clear(this.path)
    SpellLocation.registry.clear(this.path)
  }

  /**
   * Path to file, as specified by server.
   * MUST be passed to constructor.
   */
  @writeOnce path

  /** `location` object which we can use to get various bits of the path. */
  @forward("projectId", "projectName", "filePath", "folder", "file", "fileName", "extension")
  @memoize
  get location() {
    return new SpellLocation(this.path)
  }

  /**
   * Pointer to our `SpellProject`.
   */
  @memoize
  get project() {
    return new SpellProject(this.projectId)
  }

  /**
   * Return promise which yields our `info` record according to the project manifest.
   * Note that `modified` and `size` may be out of sync if we've been modified on the client.
   */
  get info() {
    return this.project.getFileInfo(this.path)
  }

  //-----------------
  //  Compiling/etc
  //-----------------

  /** Our scope with which we've compiled. */
  @state scope = undefined

  /** Results of our last `parse()` as a `Match`. */
  @state match = undefined

  /** AST for our `compiled` output. */
  @state AST = undefined

  /** Our `compiled` output as javascript. */
  @state compiled = undefined

  /** Reset our compiled state. */
  resetCompiled() {
    this.resetState("scope", "match", "AST", "compiled")
  }

  /**
   * Return a `Scope` for parsing this file, which is always the `rootScope`.
   * TODO... ????
   */
  getScope() {
    return SpellParser.rootScope
  }

  /** Reset our compiled state. */
  resetCompiled() {
    this.resetState("scope", "match", "AST", "compiled")
  }

  /** "parse" the css file */
  async parse(parentScope) {
    if (this.match) return this.match
    await this.load()
    this.resetCompiled()
    const token = new Token.Text({ value: this.contents, raw: this.contents, offset: 0 })
    const scope = this.getScope(parentScope)
    const match = scope.parse([token], "css")
    // HACK
    match.file = this.name
    batch(() => {
      this.setState("scope", scope)
      this.setState("match", match)
    })
    return this.match
  }

  /** "compile" the CSS file  */
  async compile(parentScope) {
    const match = await this.parse(parentScope)
    batch(() => {
      this.setState("AST", match.AST)
      this.setState("compiled", match.compile())
    })
    return this.compiled
  }

  //-----------------
  //  Loading / Saving
  //-----------------

  /** Update file contents when you  do `spellFile.save(contents)` or `spellFile.save({ contents })`. */
  @proto autoUpdateContentsOnSave = true

  /** Derive `url` from our `path` if not explicitly set. */
  @overridable get url() {
    return `/api/projects/file/${this.projectId}${this.filePath}`
  }

  //-----------------
  //  Rendering utilities
  //-----------------

  /** Convert CodeMirror Position: `{ line, ch }` to char `offset`. */
  offsetForPosition({ line, ch }) {
    if (!this.inputLines) return undefined
    if (line === 0) return ch
    return this.inputLines.slice(0, line).join("\n").length + 1 + ch
  }

  //-----------------
  //  Debug
  //-----------------
  toString() {
    return `${this.constructor.name}: ${this.path}`
  }
}
