//----------------------------
//  Core library for JS code emitted from `spell` language
//
//  All compiled spell modules can assume that `spell` and `assert` are in scope.
//
//----------------------------
import { assert } from "./assert"
import { spellCore } from "./core"
import "./collection-core"
import "./collection-other"
import "./paths"
import "./string"
import { SpellEvent, Eventful } from "./SpellEvent"
import "./tests"
import "./console"
import "./runtime"
import "./ui"

export { spellCore, assert, SpellEvent, Eventful }
export * from "./classes"
