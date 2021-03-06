//
//  # Rules for expressions.
//

import { proto } from "~/util"
import { Match, Rule } from "~/parser"
import { AST, SpellParser } from "~/languages/spell"

/** TODOC!!! */
SpellParser.Rule.InfixOperatorSuffix = class infix_operator extends Rule.Sequence {
  // set `outputDatatype` to specify explicit datatype in standard `getAST()`

  /** If `true`, we'll wrap output expression in parenthesis. */
  @proto parenthesize = false

  /** Return output operator from `operator` match. Override for more complex logic.
   * TODO: this is language-dependent!
   */
  getOutputOperator(operator) {
    // Default to just use input string
    return operator.value
  }

  /** Return `true` if we should "negate" the output expression based on `operator`.
   * TODO: this is language-dependent!
   */
  shouldNegateOutput(operator) {
    return false
  }

  /**
   * - `lhs` is left-hand side AST
   * - `operator` is operator Match
   * - `rhs` is right-hand-side AST
   * By default does an InfixExpression, override to e.g. do a CoreMethodInvocation()
   */
  compileASTExpression(match, { lhs, operator, rhs }) {
    return new AST.InfixExpression(match, {
      lhs,
      operator: this.getOutputOperator(operator),
      rhs
    })
  }

  /**
   * While running the "shunting yard algorithm" in getAST(), we'll match
   * `Infix-` and `PostfixOperatorSuffix` instances with args on left/right side.
   * This routine delegates to rule-specific `compileASTExpression()` to actually output
   * the particular AST for the rule.
   *
   * This routine also handles adding parenthesis and negating the output for you automatically.
   *
   * `lhs` is the left-hand-side Match AST (NOTE: already AST calculated!)
   * `operator` is the operator Match
   * `rhs` (for InfixOperatorSuffixes only) is the right-hand-side Match AST.
   */
  compileAST(match, { operator, rhs, lhs }) {
    let expression = this.compileASTExpression(match, { lhs, operator, rhs })
    if (this.parenthesize && !(expression instanceof AST.ParenthesizedExpression)) {
      expression = new AST.ParenthesizedExpression(match, { expression })
    }
    if (this.shouldNegateOutput(operator)) expression = new AST.NotExpression(match, { expression })
    return expression
  }

  getAST(match) {
    throw new TypeError("This should never be called")
  }
}

/** TODOC!!! */
SpellParser.Rule.PostfixOperatorSuffix = class postfix_operator extends SpellParser.Rule.InfixOperatorSuffix {
  /**
   * - `lhs` is left-hand side match
   * - `operator` is raw full input operator string
   */
  compileASTExpression(match, { lhs, operator }) {
    throw new TypeError("Must implement compileASTExpression()")
  }
}

export const expressions = new SpellParser({
  module: "expressions",
  rules: [
    {
      name: "parenthesized_expression",
      alias: ["expression"],
      syntax: "\\( {expression} \\)",
      testRule: "\\(",
      getAST(match) {
        const { expression } = match.groups
        return new AST.ParenthesizedExpression(match, {
          expression: expression.AST
        })
      },
      tests: [
        {
          title: "correctly matches parenthesized expressions",
          beforeEach(scope) {
            scope.variables.add("thing")
          },
          tests: [
            ["(thing)", "(thing)"],
            ["((thing))", "(thing)"],
            ["(((thing)))", "(thing)"],
            ["(1 and yes)", "(1 && true)"]
          ]
        },
        {
          title: "correctly matches multiple parenthesis",
          compileAs: "expression",
          tests: [
            ["(1) and (yes)", "((1) && (true))"],
            ["((1) and (yes))", "((1) && (true))"],
            ["((1) and ((yes)))", "((1) && (true))"]
          ]
        },
        {
          title: "doesn't match malformed parenthesized expressions",
          tests: [
            ["(foo", undefined],
            ["(foo(bar)baz", undefined]
          ]
        }
      ]
    },

    {
      name: "compound_expression",
      alias: "expression",
      isLeftRecursive: true,
      precedence: 12,
      syntax: "{lhs:simple_expression} {rhsChain:expression_suffix}+",
      getAST(match) {
        function applyOperatorToRule({ match: ruleMatch, operator, rhs, lhs }) {
          function compile(thing) {
            if (!thing) return undefined
            // TODO: we have one case ("is the queen of spades") where `thing` match is an array... :-(
            if (Array.isArray(thing)) return thing.map(compile)
            if (thing instanceof Match && thing.rule.getAST) return thing.AST
            return thing
          }

          const args = {
            operator,
            rhs: compile(rhs),
            lhs: compile(lhs)
          }
          const result = ruleMatch.rule.compileAST(ruleMatch, args)
          return result
        }

        // Iterate through the rhs expressions, using a variant of the shunting-yard algorithm
        //  to deal with operator precedence.  Note that we assume:
        //  - all infix operators are `left-to-right` associative, and
        //  - all postfix operators are left to right associative.
        // See: https://en.wikipedia.org/wiki/Shunting-yard_algorithm
        // See: https://www.chris-j.co.uk/parsing.php
        const { lhs, rhsChain } = match.groups
        const output = [lhs]
        const opStack = []
        rhsChain.matched.forEach((rhs) => {
          // Unary postfix operator, e.g. "<lhs> is empty"
          if (rhs.rule instanceof SpellParser.Rule.PostfixOperatorSuffix) {
            const args = {
              match: rhs,
              lhs: output.pop(),
              // use explicit operator if there is one, default to entire match
              operator: rhs.groups.operator || rhs
            }
            output.push(applyOperatorToRule(args))
          }
          // Infix binary operator, e.g. "<lhs> is a <rhs>"
          else if (rhs.rule instanceof SpellParser.Rule.InfixOperatorSuffix) {
            const { operator, expression } = rhs.groups

            // While top operator on stack is higher precedence than this one
            while (opStack[opStack.length - 1]?.match.rule.precedence >= rhs.rule.precedence) {
              // pop the top operator and compile it with top 2 things on the output stack
              const topOp = opStack.pop()
              const args = {
                ...topOp,
                rhs: output.pop(), // NOTE: order is vital here!
                lhs: output.pop()
              }
              output.push(applyOperatorToRule(args))
            }

            // Push the current operator and expression
            opStack.push({ match: rhs, operator })
            output.push(expression)
          } else {
            console.warn("Unexpected rule type", rhs.rule.name)
          }
        })

        // At this point, we have only binary operators in the output stack.
        // Run through them and apply the operator to them in pairs.
        let topOp
        while ((topOp = opStack.pop())) {
          const args = {
            ...topOp,
            rhs: output.pop(), // NOTE: order is vital here!
            lhs: output.pop()
          }
          output.push(applyOperatorToRule(args))
        }
        if (output.length !== 1) {
          console.warn("Shunting yard ended up with too much output:", output)
        }
        return output[0]
      },

      // test multiple infix expressions in a row
      tests: [
        {
          title: "complex math expressions",
          compileAs: "expression",
          tests: [
            ["1 + 2 + 3", "((1 + 2) + 3)"],
            ["(1+1) * (2+2)", "((1 + 1) * (2 + 2))"],
            ["((1+1) * (2+2))", "((1 + 1) * (2 + 2))"]
          ]
        },
        {
          title: "complex property/etc expressions",
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("card")
          },
          tests: [[`the suit of the card is "ace"`, `(card.suit == "ace")`]]
        }
      ]
    },

    {
      name: "and",
      alias: "expression_suffix",
      syntax: "(operator:and) {expression:simple_expression}",
      precedence: 6,
      constructor: "InfixOperatorSuffix",
      getOutputOperator: () => "&&",
      parenthesize: true,
      tests: [
        {
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("thing")
            scope.variables.add("other")
            scope.variables.add("yet-another")
          },
          tests: [
            ["thing and other", "(thing && other)"],
            ["thing and other and yet-another", "((thing && other) && yet_another)"],
            ["thing is 1 and other is 2", "((thing == 1) && (other == 2))"]
          ]
        }
      ]
    },

    {
      name: "or",
      alias: "expression_suffix",
      syntax: "(operator:or) {expression:simple_expression}",
      precedence: 5,
      constructor: "InfixOperatorSuffix",
      getOutputOperator: () => "||",
      parenthesize: true,
      tests: [
        {
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("thing")
            scope.variables.add("other")
          },
          tests: [["thing or other", "(thing || other)"]]
        }
      ]
    },

    {
      name: "is",
      alias: "expression_suffix",
      precedence: 10,
      syntax: "(operator:is not?) {expression:simple_expression}",
      constructor: "InfixOperatorSuffix",
      parenthesize: true,
      getOutputOperator: (operator) => (operator.value === "is not" ? "!=" : "=="),
      tests: [
        {
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("thing")
            scope.variables.add("other")
          },
          tests: [
            ["thing is other", "(thing == other)"],
            ["thing is not other", "(thing != other)"]
          ]
        }
      ]
    },

    {
      name: "is_exactly",
      alias: "expression_suffix",
      precedence: 10,
      syntax: "(operator:is not? exactly) {expression:simple_expression}",
      constructor: "InfixOperatorSuffix",
      parenthesize: true,
      getOutputOperator: (operator) => (operator.value === "is not exactly" ? "!==" : "==="),
      tests: [
        {
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("thing")
            scope.variables.add("other")
          },
          tests: [
            ["thing is exactly other", "(thing === other)"],
            ["thing is not exactly other", "(thing !== other)"]
          ]
        }
      ]
    },

    {
      name: "is_a",
      alias: "expression_suffix",
      precedence: 11,
      syntax: "(operator:is not? (a|an)) {expression:type}",
      constructor: "InfixOperatorSuffix",
      shouldNegateOutput: (operator) => operator.value.includes("not"),
      compileASTExpression(match, { lhs, rhs }) {
        // TODO: QuotedExpression feels wrong here...
        return new AST.CoreMethodInvocation(match, {
          methodName: "isOfType",
          args: [lhs, new AST.QuotedExpression(match, { expression: rhs })]
        })
      },
      tests: [
        {
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("thing")
          },
          tests: [
            ["thing is a Bee", "spellCore.isOfType(thing, 'Bee')"],
            ["thing is an Animal", "spellCore.isOfType(thing, 'Animal')"],
            ["thing is not a Bee", "!spellCore.isOfType(thing, 'Bee')"],
            ["thing is not an Animal", "!spellCore.isOfType(thing, 'Animal')"]
          ]
        }
      ]
    },

    {
      name: "is_same_type_as",
      alias: "expression_suffix",
      precedence: 11,
      syntax: "(operator:is not? the same type as) {expression:simple_expression}",
      constructor: "InfixOperatorSuffix",
      getOutputOperator: (operator) => (operator.value.includes("not") ? "!==" : "==="),
      compileASTExpression(match, { lhs, rhs }) {
        return new AST.CoreMethodInvocation(match, {
          methodName: "matchesType",
          args: [lhs, rhs]
        })
      },
      tests: [
        {
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("thing")
            scope.variables.add("other")
          },
          tests: [
            ["thing is the same type as other", "spellCore.matchesType(thing, other)"],
            ["thing is not the same type as other", "spellCore.matchesType(thing, other)"]
          ]
        }
      ]
    },

    {
      name: "is_in",
      alias: "expression_suffix",
      precedence: 11,
      syntax:
        "(operator:is (not? in|not? one of|either|not either of?|neither)) (expression:{simple_expression}|{identifier_list})",
      constructor: "InfixOperatorSuffix",
      shouldNegateOutput: ({ value }) => value.includes("not") || value.includes("neither"),
      compileASTExpression(match, { lhs, rhs }) {
        return new AST.CoreMethodInvocation(match, {
          methodName: "includes",
          args: [rhs, lhs]
        })
      },
      tests: [
        {
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("thing")
            scope.variables.add("red")
            scope.constants.add("green")
            scope.variables.add("theList")
          },
          tests: [
            ["thing is in theList", "spellCore.includes(theList, thing)"],
            ["thing is one of theList", "spellCore.includes(theList, thing)"],
            ["thing is not in theList", "!spellCore.includes(theList, thing)"],
            ["thing is not one of theList", "!spellCore.includes(theList, thing)"],
            ["thing is either red or green", "spellCore.includes([red, 'green'], thing)"],
            ["thing is not either red or green", "!spellCore.includes([red, 'green'], thing)"],
            ["thing is not either of red or green", "!spellCore.includes([red, 'green'], thing)"],
            ["thing is neither red nor green", "!spellCore.includes([red, 'green'], thing)"]
          ]
        }
      ]
    },

    {
      name: "includes",
      alias: "expression_suffix",
      precedence: 11,
      syntax: "(operator:includes|contains) {expression:simple_expression}",
      constructor: "InfixOperatorSuffix",
      compileASTExpression(match, { lhs, rhs }) {
        return new AST.CoreMethodInvocation(match, {
          methodName: "includes",
          args: [lhs, rhs]
        })
      },
      tests: [
        {
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("theList")
            scope.variables.add("thing")
          },
          tests: [
            ["theList includes thing", "spellCore.includes(theList, thing)"],
            ["theList contains thing", "spellCore.includes(theList, thing)"]
          ]
        }
      ]
    },

    {
      name: "does_not_include",
      alias: "expression_suffix",
      precedence: 11,
      syntax: "(operator:does not (include|contain)) {expression:simple_expression}",
      constructor: "InfixOperatorSuffix",
      shouldNegateOutput: () => true,
      compileASTExpression(match, { lhs, rhs }) {
        return new AST.CoreMethodInvocation(match, {
          methodName: "includes",
          args: [lhs, rhs]
        })
      },
      tests: [
        {
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("theList")
            scope.variables.add("thing")
          },
          tests: [
            ["theList does not include thing", "!spellCore.includes(theList, thing)"],
            ["theList does not contain thing", "!spellCore.includes(theList, thing)"]
          ]
        }
      ]
    },

    {
      name: "is_defined",
      alias: "expression_suffix",
      precedence: 11,
      syntax: "is (defined|undefined|not defined)",
      constructor: "PostfixOperatorSuffix",
      shouldNegateOutput: (operator) => operator.value !== "is defined",
      compileASTExpression(match, { lhs }) {
        return new AST.CoreMethodInvocation(match, {
          methodName: "isDefined",
          args: [lhs]
        })
      },
      tests: [
        {
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("thing")
          },
          tests: [
            ["thing is defined", "spellCore.isDefined(thing)"],
            ["thing is undefined", "!spellCore.isDefined(thing)"],
            ["thing is not defined", "!spellCore.isDefined(thing)"]
          ]
        }
      ]
    },

    {
      name: "exists",
      alias: "expression_suffix",
      precedence: 11,
      syntax: "(exists|does not exist)",
      constructor: "PostfixOperatorSuffix",
      shouldNegateOutput: (operator) => operator.value !== "exists",
      compileASTExpression(match, { lhs }) {
        return new AST.CoreMethodInvocation(match, {
          methodName: "isDefined",
          args: [lhs]
        })
      },
      tests: [
        {
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("thing")
          },
          tests: [
            ["thing exists", "spellCore.isDefined(thing)"],
            ["thing does not exist", "!spellCore.isDefined(thing)"]
          ]
        }
      ]
    },

    {
      name: "there_is_a",
      alias: "expression",
      precedence: 11,
      syntax: "there (operator:is not? (a|an)|is no such) {expression}",
      getAST(match) {
        const { operator } = match.groups
        const expression = new AST.CoreMethodInvocation(match, {
          methodName: "isDefined",
          args: [match.groups.expression.AST]
        })
        if (operator.value.includes("no")) return new AST.NotExpression(match, { expression })
        return expression
      },
      tests: [
        {
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("thing")
            scope.variables.add("animal")
          },
          tests: [
            { input: "there is a thing", output: "spellCore.isDefined(thing)" },
            { input: "there is an animal", output: "spellCore.isDefined(animal)" },
            { input: "there is not a thing", output: "!spellCore.isDefined(thing)" },
            { input: "there is no such animal", output: "!spellCore.isDefined(animal)" }
          ]
        }
      ]
    },

    /** Collection is empty */
    {
      name: "is_empty",
      alias: "expression_suffix",
      precedence: 11,
      syntax: "(operator:is not? empty)",
      constructor: "PostfixOperatorSuffix",
      shouldNegateOutput: (operator) => operator.value.includes("not"),
      compileASTExpression(match, { lhs }) {
        return new AST.CoreMethodInvocation(match, {
          methodName: "isEmpty",
          args: [lhs]
        })
      },
      tests: [
        {
          compileAs: "expression",
          beforeEach(scope) {
            scope.variables.add("thing")
          },
          tests: [
            ["thing is empty", "spellCore.isEmpty(thing)"],
            ["thing is not empty", "!spellCore.isEmpty(thing)"]
          ]
        }
      ]
    },

    /** String utilities */
    {
      name: "as_uppercase",
      alias: "expression_suffix",
      precedence: 11,
      syntax: "as (upper case|uppercase)",
      constructor: "PostfixOperatorSuffix",
      compileASTExpression(match, { lhs }) {
        return new AST.CoreMethodInvocation(match, {
          methodName: "upperCase",
          args: [lhs]
        })
      },
      tests: [
        {
          compileAs: "expression",
          tests: [
            [`"foo" as upper case`, `spellCore.upperCase("foo")`],
            [`1 as uppercase`, `spellCore.upperCase(1)`]
          ]
        }
      ]
    },
    {
      name: "as_lowercase",
      alias: "expression_suffix",
      precedence: 11,
      syntax: "as (lower case|lowercase)",
      constructor: "PostfixOperatorSuffix",
      compileASTExpression(match, { lhs }) {
        return new AST.CoreMethodInvocation(match, {
          methodName: "lowerCase",
          args: [lhs]
        })
      },
      tests: [
        {
          compileAs: "expression",
          tests: [
            [`"foo" as lower case`, `spellCore.lowerCase("foo")`],
            [`1 as lowercase`, `spellCore.lowerCase(1)`]
          ]
        }
      ]
    }
  ]
})
