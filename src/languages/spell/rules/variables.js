//
//  # Rules for variables
//
import {
  Match,
  Rule,
  Scope,
  Spell,
  Token,

  proto,
  snakeCase,
  typeCase,
  singularize,
  pluralize
} from "../all.js";

import identifierBlacklist from "./identifier-blacklist.js";

// Alpha-numeric word, including dashes or underscores.
const WORD = /^[a-zA-Z][\w\-]*$/;

// Single word variable name, known or unknown.
// TODO: type based on scope variable type?
// TODO: higher precedence if variable is known?
Spell.Rule.Variable = class variable extends Rule.Pattern {
  @proto pattern = WORD;
  @proto blacklist = identifierBlacklist;
  valueMap(value) {
    return (""+value).replace(/-/g, "_");
  }
}

export default new Spell.Parser({
  module: "variables",
  rules: [
    // Variable identifier with no adornments.
    // You won't generally use this, use `variable` or `unknown_variable` instead.
    {
      name: "variable_identifier",
      constructor: Spell.Rule.Variable
    },

    // Variable which may or may not be known, with optional `the` prefix.
    {
      name: "variable",
      // NOTE: `match` returned is the `{variable_identifier}`, not this sequence.
      syntax: "the? {variable_identifier}",
      constructor: class variable extends Rule.Sequence {
        parse(scope, tokens) {
          const match = super.parse(scope, tokens);
          if (!match) return;
          // Return just the `variable_identifier` bit, adjusting `length` to account for `the` as necessary.
          const varMatch = match.matched[match.matched.length - 1];
          varMatch.length = match.length;
          return varMatch;
        }
      },
      tests: [
        {
          tests: [
            { title:"single word", input: "thing", output: "thing" },
            { title:"multi-word", input: "bank-account", output: "bank_account" },
            { title:"blacklisted word", input: "if", output: undefined },
          ]
        }
      ]
    },


    // Single word variable which is already known by our scope, with optional `the` prefix
    // Note that we match this as an "expression".
    {
      name: "known_variable",
      alias: ["expression", "single_expression"],
      // NOTE: `match` returned is the `{variable_identifier}`, not this sequence.
      syntax: "the? {variable_identifier}",
      constructor: class known_variable extends Rule.Sequence {
        parse(scope, tokens) {
          const match = super.parse(scope, tokens);
          if (!match) return;
          // Return just the `variable_identifier` bit, adjusting `length` to account for `the` as necessary.
          const varMatch = match.matched[match.matched.length - 1];
          varMatch.length = match.length;

          varMatch.variable = scope.variables(varMatch.raw);
          if (varMatch.variable) return varMatch;
        }
      },
      tests: [
        {
          compileAs: "known_variable",    // TODO: "expression"
          beforeEach(scope) {
            scope.variables.add("thing");
            scope.variables.add("bank-account");
          },
          tests: [
            { title:"single word", input: "thing", output: "thing" },
            { title:"multi-word", input: "bank-account", output: "bank_account" },
            { title:"not defined", input: "nothing", output: undefined },
          ]
        }
      ]
    },

    // Possibly unknown variable identifier which MUST be singular, WITHOUT `the`.
    {
      name: "singular_variable",
      constructor: class singular_variable extends Spell.Rule.Variable {
        parse(scope, tokens) {
          const match = super.parse(scope, tokens);
          if (!match) return;
          if (match.raw === singularize(match.raw)) return match;
        }
      },
      tests: [
        {
          tests: [
            { title:"singular, single word", input: "thing", output: "thing" },
            { title:"singular, multi-word", input: "bank-account", output: "bank_account" },
            { title:"plural, single word", input: "things", output: undefined },
            { title:"plural, multi-word", input: "bank-accounts", output: undefined },
          ]
        }
      ]
    },

    // Possibly unknown variable identifier which MUST be plural, WITHOUT `the`.
    {
      name: "plural_variable",
      constructor: class plural_variable extends Spell.Rule.Variable {
        parse(scope, tokens) {
          const match = super.parse(scope, tokens);
          if (!match) return;
          if (match.raw === pluralize(match.raw)) return match;
        }
      },
      tests: [
        {
          tests: [
            { title:"plural, single word", input: "things", output: "things" },
            { title:"plural, multi-word", input: "bank-accounts", output: "bank_accounts" },
            { title:"singular, single word", input: "thing", output: undefined },
            { title:"singular, multi-word", input: "bank-account", output: undefined },
          ]
        }
      ]
    },
  ]
});