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
import flattenDeep from "lodash/flattenDeep";

import { Match, Rule } from "./all.js";

// Sequence of rules to match.
//  `rule.rules` is the array of rules to match.
//  `rule.testRule` is a QUICK rule to test if there's any way the sequence can match.
Rule.Sequence = class sequence extends Rule {
  constructor(props) {
    if (arguments.length > 1) props = { rules: [...arguments] };
    if (Array.isArray(props)) props = { rules: props };
    if (!props.rules) throw new TypeError(`Sequence '${props.name}' created without specifying 'rules'!`);
    super(props);
  }
  parse(scope, tokens) {
    if (this.test(scope, tokens) === false) return undefined;

    const matched = [];
    let length = 0;

    let remainingTokens = tokens;
    for (let i = 0, rule; rule = this.rules[i++];) {
      // If we're out of tokens, bail if rule is not optional
      if (remainingTokens.length === 0) {
        if (rule.optional) continue;
        return undefined;
      }
      let match = rule.parse(scope, remainingTokens);
      if (!match) {
        if (rule.optional) continue;
        return undefined;
      }

      matched.push(match);
      length += match.length;
      remainingTokens = remainingTokens.slice(match.length);
    }

    // if we get here, we matched all the rules!
    return new Match({
      rule: this,
      matched,
      length,
      scope
    })
  }

  // If no explcit compile method, return our `results` for someone else to consume.
  compile(scope, match) {
    return this.gatherResults(scope, match);
  }

  getTokens(match) {
    return flattenDeep(match.matched.map(match => match.getTokens(match)));
  }

  getStructure(scope, match) {
    return match.matched.map(match => match.structure);
  }

  //TODOC
  // "gather" matched values into a map in preparation to call `compile(scope, match)`
  gatherResults(scope, match) {
    return this._addResults({}, match.matched, match => match.compile());
  }

  gatherMatches(scope, match) {
    return this._addResults({}, match.matched);
  }

  _addResults(results, matched, callback) {
    for (let i = 0, match; match = matched[i]; i++) {
      const { promote, name } = match;
      if (promote) {
        this._addResults(results, match.matched, callback);
      } else {
        if (name == null) continue;

        const value = callback ? callback(match) : match;
        // If arg already exists, convert to an array
        if (name in results) {
          if (!Array.isArray(results[name])) {
            results[name] = [results[name]];
          }
          results[name].push(value);
        } else {
          results[name] = value;
        }
      }
    }
    return results;
  }

  // Echo this rule back out.
  toSyntax() {
    const { testLocation, promote, argument, optional } = this.getSyntaxFlags();
    const rules = this.rules.map(rule => rule.toSyntax()).join(" ");
    if (promote || optional || argument)
      return `(${promote}${argument}${rules})${optional}`;
    return `${rules}${optional}`;
  }
}