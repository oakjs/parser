import { Rule } from "./all.js";

// Sequence that is known to be only `Literal(s)` or `Pattern`.
// Use this to get the entire literal string back on `compile()`.
Rule.LiteralSequence = class literalSequence extends Rule.Sequence {
  compile(scope, match) {
    return match.matched.map(match => match.compile()).join(" ");
  }
}