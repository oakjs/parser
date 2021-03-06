import _ from "lodash"

import { Match, Rule, Token } from "~/parser"
import { SpellParser, AST, spellParser } from "~/languages/spell"

/** Update Rule.BlankLine to output AST properly. */
Rule.BlankLine.prototype.getAST = function (match) {
  return new AST.BlankLine(match)
}

// Use `BlockLine` to parse a single `Token.Line` in a `Token.Block` as:
// - a `statement`
// - an optional `comment` at the end of the line
// - if the `statement.wantsNestedBlock` and the next item in `lines` is a `Token.Block`
//   we'll let the statement attempt to parse the next line as well.
SpellParser.Rule.BlockLine = class line extends Rule {
  parse(scope, lines) {
    // eslint-disable-next-line no-shadow
    const line = lines[0]
    if (!line) return undefined
    const matched = []
    const errors = []
    const input = [line]
    const { tokens } = line
    // Blank line
    if (tokens.length === 0) {
      const token = line.newLine || line.leading
      matched.push(
        new Match({
          rule: scope.parser.getRuleOrDie("blank_line"),
          matched: [token],
          length: 1,
          input: [token],
          scope
        })
      )
    }
    // parse as a `statement` with optional `comment`
    else {
      const start = 0
      let end = tokens.length

      // pop comment (which will be a single token) off of the end if found
      const last = tokens[tokens.length - 1]
      const comment = scope.parse([last], "comment")
      if (comment) {
        end -= 1
        // add comment BEFORE statement
        matched.push(comment)
      }

      // parse the statement (which may parse an inlineStatement as well)
      const unparsed = tokens.slice(start, end)
      const statement = scope.parse(unparsed, "statement")
      if (statement) {
        matched.push(statement)
        unparsed.splice(0, statement.length)
      }

      // add anything unparsed at the end as a parse error
      if (unparsed.length) {
        const error = scope.parse(unparsed, "parse_error")
        errors.push(error)
        matched.push(error)
      }

      if (statement) {
        // We've locked in this statement -- have it update scope if necessary.
        // This is used, e.g. by assignment to add new variables to the scope, etc.
        statement.mutateScope()

        // Some statements `.wantsNestedBlock` -- give it a chance to parse the next item.
        const nextItem = lines[1]
        if (statement.rule.wantsNestedBlock && nextItem instanceof Token.Block) {
          const nestedBlock = statement.rule.parseNestedBlock(statement, nextItem)
          if (nestedBlock) {
            // add any errors in the nestedBlock to `errors`
            if (nestedBlock.errors) errors.push(...nestedBlock.errors)
            // add the nestedBlock to `input` to account for it in the output
            input.push(nextItem)
          }
        }

        // HACK HACK HACK
        // OK, we've procesed the statement and its nested block if there is one.
        // Lock in it's (memoized) AST in case the rule's `getAST()` method ALSO mutates scope.
        // eslint-disable-next-line no-unused-vars
        const ast = statement.AST

        // TODO: not sure if this is needed anymore
        // Check JSX, that seems to be setting it???
        if (statement.error) {
          console.warn("Got unexpected statement.error for", statement.rule.name)
          errors.push(error)
          matched.push(statement.error)
        }

        // Add parse error if we got both a `nestedBlock` and an `inlineStatement`
        const { inlineStatement, nestedBlock } = statement.groups
        if (inlineStatement && nestedBlock) {
          const error = spellParser.createParseError(
            scope,
            [line, nextItem],
            "Got both inline statement and nested block"
          )
          errors.push(error)
          matched.push(error)
        }
      }
    }
    return new Match({
      rule: this,
      matched,
      errors: errors.length ? errors : undefined,
      input,
      length: input.length,
      scope
    })
  }

  getAST(match) {
    // ???  If only one matched item, return it by itself
    if (match.matched.length === 1) return match.matched[0].AST
    // otherwise
    return new AST.StatementGroup(match, {
      statements: match.matched.map((item) => item.AST)
    })
  }
}
