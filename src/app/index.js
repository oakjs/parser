// Guarantee async/await works in all environments.
import "@babel/polyfill"

export * from "./redux"

// Parser bits
export * from "../parser"
export { spellParser, Spell, Scope } from "../languages/spell"

// Spell "core" library
export { default as spellCore } from "../languages/spell/spell-core"