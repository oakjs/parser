import { Match, proto, Rule } from "./all.js";

// Abstract rule for one or more sequential literal values to match.
// `rule.literals`:
//    the literal string or array of literal strings to match.
// `rule.literalSeparator`
//    the string to put between multiple literals when joining multiple literals together.
Rule.Literals = class literals extends Rule {
  // By default, join literals with no space between
  @proto literalSeparator = "";

  constructor(props) {
    if (arguments.length > 1) props = [...arguments];
    if (Array.isArray(props)) props = { literals: props };
    if (typeof props === "string") props = { literals: props };
    if (typeof props.literals === "string") props.literals = [props.literals];
    super(props);
  }

  // Return the NUMBER OF TOKENS MATCHED.  `0` = no match.
  testAtStart(scope, tokens, start = 0) {
    for (let i = 0, literal; literal = this.literals[i]; i++) {
//console.info(i, literal, start, tokens[start]);
      const matched = tokens[start]?.matchesLiteral(literal);
      if (matched)
        start++;
      else if (!literal.optional)
        return false;
    }
    return start;
  }

  parse(scope, tokens) {
    const tokensMatched = this.testAtStart(scope, tokens, 0);
    if (!tokensMatched) return undefined;
    return new Match({
      rule: this,
      matched: tokens.slice(0, tokensMatched),
      length: tokensMatched,
      scope
    });
  }

  compile(scope, match) {
    return this.getTokens(match).join(this.literalSeparator);
  }

  toSyntax() {
    const { testLocation, promote, argument, optional } = this.getSyntaxFlags();

    const literals = this.literals.map(literal => {
      if (typeof literal === "string") return literal;
      const optional = literal.optional ? "?" : "";
      if (literal.length === 1) return `${literal}${optional}`;
      return `(${literal.join("|")})${optional}`;
    }).join(this.literalSeparator);

    const wrapInParens =
      promote ||
      argument ||
      ((testLocation || optional) && this.literals.length > 1)
    ;
    if (wrapInParens)
      return `${testLocation}(${promote}${argument}${literals})${optional}`;
    return `${testLocation}${literals}${optional}`;
  }
};

// One or more literal symbols: `<`, `%` etc.
// Symbols join WITHOUT spaces.
Rule.Symbols = class symbols extends Rule.Literals {};

// One or more literal keywords.
// Keywords join WITH spaces.
Rule.Keywords = class keywords extends Rule.Literals {
  // Join literals with a space in-between.
  @proto literalSeparator = " ";
};