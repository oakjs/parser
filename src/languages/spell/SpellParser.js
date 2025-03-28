import { proto, memoize } from "~/util"
import { RootScope, ProjectScope, Parser, Tokenizer, WhitespacePolicy } from "~/parser"
import { spellParser } from "~/languages/spell"
import { spellCore } from "~/spellCore"

export class SpellParser extends Parser {
  /** Add language-specific top-level rules to this object. */
  static Rule = {}

  // Name of the module in which we were defined.
  @proto module = undefined

  // Name of our default rule to parse if calling `parser.parse(text)`.
  @proto defaultRule = "block"

  @proto tokenizer = new Tokenizer({
    // Only support double-quotes as quote symbols (so we can do contractions with single quotes)
    quoteSymbols: [`"`],
    // Remove "normal" whitespace (leaving newlines and indents) when parsing
    whitespacePolicy: WhitespacePolicy.LEADING_ONLY
  })

  /** Override `addRule` to also add to `simple_expression` or `simple_statement` as necessary. */
  addRule(rule, names) {
    if (Array.isArray(names) && !rule.isLeftRecursive) {
      if (names.includes("expression")) names.push("simple_expression")
      if (names.includes("statement")) names.push("simple_statement")
    }
    super.addRule(rule, names)
  }

  /**
   * `rootScope` for all spellParsers -- contains base rules, types, constants.
   * All project scopes will point back to this.
   */
  @memoize
  static get rootScope() {
    const scope = new RootScope({ name: "spellRoot", parser: spellParser })
    // Add all BASE_TYPES defined in `spellCore`.
    // See: `src/languages/spell/spellCore/classes/index.js`
    spellCore.BASE_TYPES.forEach((type) => scope.types.add(type))
    return scope
  }

  // Return a scope with a new parser which depends on this parser.
  // This lets us update rules/etc as desired without affecting the original parser.
  // DOCME
  getScope(moduleName = "ad_hoc") {
    const parser = this.clone({ module: moduleName })
    return new ProjectScope({
      name: moduleName,
      parser,
      scope: SpellParser.rootScope
    })
  }

  // If we're tokenizing "block", parse them into blocks.
  tokenize(input, ruleName) {
    const tokens = super.tokenize(input)
    if (typeof input === "string" && ruleName === "block") return this.tokenizer.breakIntoBlocks(tokens)
    return tokens
  }
}
