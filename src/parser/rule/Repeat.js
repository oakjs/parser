//  # Parser Rules
//  Rules can be as simple as a string `Keyword` or a complex sequence of (nested) rules.
//
//  Parse a rule with `rule.parse(scope, tokens)`.
//  If UNSUCCESSFUL, it will return `undefined`
//  If SUCCESSFUL,   it will return a new `Match()` object which is guaranteed to have:
//    - `match.rule`        : pointer back to the rule.
//    - `match.matched`     : array of *significant* tokens that were actually matched.
//    - `match.length` : number of tokens actually consumed (`matched` may not contain them all)
//    ... and other rule-specific values.
//
//  The match returned can be manipulated with:
//    - `match.compile()`    Return javascript source to interpret the rule.
//
import flattenDeep from "lodash/flattenDeep"

import { Match } from "~/parser"
import { Rule } from "."

// Repeating rule.
//  `this.rule` is the rule that repeats.
//  `rule.delimiter` (optional) if provided, we'll look for one of these
//      between each instance of `rule`. The delimiter at the end is optional.
//      Note that the delimiters are NOT added to the `matched` array.
//  `this.optional` is true if the prodution is optional.
//  `rule.testRule` is a QUICK rule to test if there's any way the sequence can match.
//  `rule.minCount` is the minimum number we need to match successfully.
//  `rule.maxCount` is the maximum number we need to match successfully.
//
//  In our `Match`, `items` will be just he bits matched without the delimiter.
//
//  Note: Returns `undefined` if we don't match at least once.
export class Repeat extends Rule {
  constructor(props) {
    if (props instanceof Rule) props = { rule: props }
    super(props)
  }

  parse(scope, tokens) {
    if (this.testAtStart(scope, tokens, 0) === false) return undefined

    // everything that was matched
    const matched = []
    // items only
    const items = []
    let length = 0

    let remainingTokens = tokens
    while (remainingTokens.length) {
      const match = this.rule.parse(scope, remainingTokens)
      if (!match) break
      matched.push(match)
      items.push(match)
      length += match.length
      remainingTokens = remainingTokens.slice(match.length)

      if (this.delimiter) {
        // get delimiter, exiting if not found
        const delimiter = this.delimiter.parse(scope, remainingTokens)
        if (!delimiter) break
        matched.push(delimiter)
        length += delimiter.length
        remainingTokens = remainingTokens.slice(delimiter.length)
      }
    }

    // Forget it if nothing matched at all
    if (matched.length === 0) return undefined
    if (typeof this.minCount === "number" && matched.length < this.minCount) return undefined
    if (typeof this.maxCount === "number" && matched.length > this.maxCount) return undefined

    const match = new Match({
      rule: this,
      matched,
      items,
      input: flattenDeep(matched.map(next => next.input)),
      length,
      scope
    })
    if (this.argument) match.argument = this.argument
    return match
  }

  compile(match) {
    return match.items.map(next => next.compile())
  }

  toSyntax() {
    const { argument, optional } = this.getSyntaxFlags()
    const repeatSymbol = this.optional ? "*" : "+"

    // don't double-up on parens
    let rule = this.rule.toSyntax()
    if (this.delimiter) {
      const delimiter = this.delimiter.toSyntax()
      return `[${argument}${rule}${delimiter}]${optional}`
    }

    const wrapInParens =
      argument ||
      this.rule instanceof Rule.Sequence ||
      (this.rule instanceof Rule.Literals && this.rule.literals.length > 1)

    if (wrapInParens && rule.startsWith("(") && rule.endsWith(")")) rule = rule.slice(1, -1)

    if (wrapInParens) return `(${argument}${rule})${repeatSymbol}`
    return `${rule}${repeatSymbol}`
  }
}
