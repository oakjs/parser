//
//  # Core `rules` -- simple datatypes, etc.
//
// NOTE: many of the below are created as custom Pattern subclasses for debugging.
//
import {
  Parser,
  proto,
  Rule,
  RulexParser,
  TestLocation,
  Token,
} from "./all.js";

const { ANYWHERE, AT_START } = TestLocation;

// Create core `rulex` rulex.
export const rulex = new RulexParser();

// Construct a rule from results of running a Combo rule below.
//  - `ruleProps` is just the props for `new constructor()`
//  - `results` is all of the results
rulex.applyFlags = function applyFlags(rule, flags) {
  // handle repeat, which may nest the rule in a repeat
  if (flags.repeatFlag === "?")
    rule.optional = true;
  else if (flags.repeatFlag === "+")
    rule = new Rule.Repeat({ repeat: rule });
  else if (flags.repeatFlag === "*")
    rule = new Rule.Repeat({ repeat: rule, optional: true });

  if (flags.promote) rule.promote = true;
  if (flags.argument) rule.argument = flags.argument;
  if (flags.testLocation) rule.testLocation = flags.testLocation;

  return rule;
}


//
//  Rules for flags in rulex syntax
//

// A test location signifier, which is always optional:
//  `…` = test anywhere in the stream (option-semicolon on mac)
//  `^` = test at start only.
const testLocation = rulex.defineRule({
  name: "testLocation",
  literal: ["…", "^"],
  optional: true,
  constructor: class rulex_testLocation extends Rule.Literal {
    compile(match) {
      return (match.matched[0].value === "…")
        ? ANYWHERE
        : AT_START;
    }
  },
  tests: [
    {
      title: "matches testLocation",
      tests: [
        ["", undefined],
        ["…", ANYWHERE],
        ["^", AT_START],
      ]
    }
  ]
})


// A promote flag, which is always optional
const promote = rulex.defineRule({
  name: "promote",
  literals: ["?", ":"],
  optional: true,
  constructor: class rulex_promote extends Rule.Symbols {
    compile(match) {
      return true;
    }
  },
  tests: [
    {
      title: "matches promote",
      tests: [
        ["", undefined ],
        ["?:", true],
        ["arg:", undefined],
      ]
    }
  ]
})

// A argument signifier, which is always optional.
const argument = rulex.defineRule({
  name: "argument",
  rules: [
    new Rule.Word({ argument: "argument" }),
    new Rule.Literal(":")
  ],
  optional: true,
  constructor: class rulex_argument extends Rule.Sequence {
    compile(match) {
      return match.results.argument;
    }
  },
  tests: [
    {
      title: "matches argument",
      tests: [
        ["", undefined],
        ["arg:", "arg"],
        ["?:", undefined ],
      ]
    }
  ]
})


// A repeat signifier, which is always optional.
const repeatFlag = rulex.defineRule({
  name: "repeatFlag",
  literal: ["?", "*", "+"],
  optional: true,
  constructor: class rulex_repeatFlag extends Rule.Literal {
    compile(match) {
      return match.matched[0].value;
    }
  },
  tests: [
    {
      title: "matches repeatFlag",
      tests: [
        ["", undefined],
        ["?", "?"],
        ["*", "*"],
        ["+", "+"],
      ]
    }
  ]
})





//
//  Combo rules
//



// A single symbol, or `\<symbol>` so we can escape special symbols like "?" and "*".
// Symbols are combined in `Sequence` if possible.
rulex.defineRule({
  name: "symbol",
  alias: "rule",
  rules: [
    testLocation,
    new Rule.Pattern({ argument: "isEscaped", pattern: /^\\$/, optional: true }),
    new Rule.TokenType({ tokenType: Token.Symbol, argument: "literal" }),
    repeatFlag
  ],
  constructor: class rulex_symbol extends Rule.Sequence {
    compile({ results }) {
      const rule = new Rule.Symbol(results.literal);
      if (results.isEscaped) rule.isEscaped = true;
      return rulex.applyFlags(rule, results);
    }
  },
  tests: [
    {
      title: "matches symbol",
      tests: [
        ["", undefined],
        // can't match flags by themselves
        ["…", undefined],
        ["^", undefined],

        [":", new Rule.Symbol({ literal:  ":"  })],
        ["?", new Rule.Symbol({ literal:  "?"  })],
        ["*", new Rule.Symbol({ literal:  "*"  })],
        ["+", new Rule.Symbol({ literal:  "+"  })],

        // only match the first one
        ["::", new Rule.Symbol({ literal:  ":"  })],

        // escaped
        ["\\:", new Rule.Symbol({ literal:  ":" , isEscaped: true })],
        ["\\?", new Rule.Symbol({ literal:  "?" , isEscaped: true })],

        // testLocation
        ["…:", new Rule.Symbol({ literal:  ":" , testLocation: ANYWHERE })],
        ["^:", new Rule.Symbol({ literal:  ":" , testLocation: AT_START })],
        ["…\\:", new Rule.Symbol({ literal:  ":" , isEscaped: true, testLocation: ANYWHERE })],

        // repeat
        [">?", new Rule.Symbol({ literal:  ">" , optional: true })],
        [">+", new Rule.Repeat(new Rule.Symbol({ literal:  ">" }))],
        [">*", new Rule.Repeat({ optional: true, repeat: new Rule.Symbol({ literal:  ">" })})],

        ["…>?", new Rule.Symbol({ testLocation: ANYWHERE, literal:  ">" , optional: true })],
        ["^>*", new Rule.Repeat({ testLocation: AT_START, optional: true, repeat: new Rule.Symbol({ literal:  ">" })})],
      ]
    }
  ]
})

// Match  keywords with an optional repeat signifier at the end.
rulex.defineRule({
  name: "keyword",
  rules: [
    testLocation,
    new Rule.Word({ argument: "literal" }),
    repeatFlag
  ],
  constructor: class rulex_keyword extends Rule.Sequence {
    compile({ results }) {
      const rule = new Rule.Keyword(results.literal);
      return rulex.applyFlags(rule, results);
    }
  },
  alias: "rule",
  tests: [
    {
      title: "matches single keyword",
      tests: [
        ["", undefined],
        ["11", undefined],
        [":", undefined],

        ["word", new Rule.Keyword({ literal:  "word"  })],

        ["…word", new Rule.Keyword({ literal:  "word" , testLocation: ANYWHERE })],
        ["^word", new Rule.Keyword({ literal:  "word" , testLocation: AT_START })],

        ["word?", new Rule.Keyword({ literal:  "word" , optional: true })],
        ["word+", new Rule.Repeat({ repeat: new Rule.Keyword({ literal:  "word"  }) })],
        ["word*", new Rule.Repeat({ optional: true, repeat: new Rule.Keyword({ literal:  "word"  }) })],

      ]
    }
  ]
})

// Subrule
rulex.defineRule({
  name: "subrule",
  rules: [
    testLocation,
    new Rule.Nested({
      start: new Rule.Symbol("{"),
      end: new Rule.Symbol("}"),
      rule: new Rule.Sequence({
        promote: true,
        rules: [
          testLocation,
          promote,
          argument,
          new Rule.Word({ argument: "subrule" }),
          new Rule.Symbol({ literal: "!", optional: true }),
          new Rule.Word({ argument: "excludes", optional: true })
        ]
      })
    }),
    repeatFlag
  ],
  alias: "rule",
  constructor: class rulex_subrule extends Rule.Sequence {
    compile({ results }) {
      const rule = new Rule.Subrule(results.subrule);
      if (results.excludes) rule.excludes = [ results.excludes ];
      return rulex.applyFlags(rule, results);
    }
  },
  tests: [
    {
      title: "matches subrule",
      compileAs: "rule",
      tests: [
        ["", undefined],
        ["{}", new Rule.Symbol("{")],

        ["{sub}", new Rule.Subrule({ subrule: "sub" }) ],
        ["{sub!excluded}", new Rule.Subrule({ subrule: "sub", excludes: [ "excluded" ] }) ],

        ["…{sub}", new Rule.Subrule({ subrule: "sub", testLocation: ANYWHERE }) ],
        ["{…sub}", new Rule.Subrule({ subrule: "sub", testLocation: ANYWHERE }) ],
        ["{?:sub}", new Rule.Subrule({ subrule: "sub", promote: true }) ],
        ["{arg:sub}", new Rule.Subrule({ subrule: "sub", argument: "arg" }) ],
        ["{^?:arg:sub}", new Rule.Subrule({ subrule: "sub", promote: true, argument: "arg", testLocation: AT_START }) ],

        ["{sub}?", new Rule.Subrule({ subrule: "sub", optional: true }) ],
        ["{sub}+", new Rule.Repeat({ repeat: new Rule.Subrule({ subrule: "sub" }) }) ],
        ["{sub}*", new Rule.Repeat({ optional: true, repeat: new Rule.Subrule({ subrule: "sub" }) }) ],

        // arg/promote/testRule need to get promoted to the repeat
        ["{…?:arg:sub!excluded}?", new Rule.Subrule({ testLocation: ANYWHERE, subrule: "sub", excludes: [ "excluded" ], promote: true, argument: "arg", optional: true}) ],
        ["{…?:arg:sub!excluded}*", new Rule.Repeat({ testLocation: ANYWHERE, promote: true, argument: "arg", optional: true, repeat: new Rule.Subrule({ subrule: "sub", excludes: ["excluded"] }) }) ],
      ]
    }
  ]
})


rulex.defineRule({
  name: "list",
  alias: "rule",
  rules: [
    new Rule.Nested({
      start: new Rule.Symbol("["),
      end: new Rule.Symbol("]"),
      rule: new Rule.Sequence({
        promote: true,
        rules: [
          promote,
          argument,
          new Rule.Subrule({ argument: "item", subrule: "rule" }),
          new Rule.Subrule({ argument: "delimiter", subrule: "rule" }),
        ]
      })
    }),
    repeatFlag
  ],
  constructor: class rulex_list extends Rule.Sequence {
    compile({ results }) {
      const rule = new Rule.List({ item: results.item, delimiter: results.delimiter });
      return rulex.applyFlags(rule, results);
    }
  },
  tests: [
    {
      title: "matches list",
      compileAs: "rule",
      tests: [
        ["", undefined],
        ["[]", new Rule.Symbol("[")],         // TODO: error for this?
        ["[{sub}]", new Rule.Symbol("[")],    // TODO: error for this?

        ["[{sub},]", new Rule.List({ item: new Rule.Subrule("sub"), delimiter: new Rule.Symbol(",") }) ],
        ["[{sub}or]", new Rule.List({ item: new Rule.Subrule("sub"), delimiter: new Rule.Keyword("or") }) ],

        ["[?:{sub},]", new Rule.List({ item: new Rule.Subrule("sub"), delimiter: new Rule.Symbol(","), promote: true }) ],
        ["[arg:{sub},]", new Rule.List({ item: new Rule.Subrule("sub"), delimiter: new Rule.Symbol(","), argument: "arg" }) ],
        ["[?:arg:{sub},]", new Rule.List({ item: new Rule.Subrule("sub"), delimiter: new Rule.Symbol(","), promote: true, argument: "arg" }) ],

        ["[{sub},]?", new Rule.List({ optional: true, item: new Rule.Subrule("sub"), delimiter: new Rule.Symbol(",") }) ],
        ["[{sub},]+", new Rule.Repeat({ repeat: new Rule.List({ item: new Rule.Subrule("sub"), delimiter: new Rule.Symbol(",") }) }) ],
        ["[{sub},]*", new Rule.Repeat({ optional: true, repeat: new Rule.List({ item: new Rule.Subrule("sub"), delimiter: new Rule.Symbol(",") }) }) ],

        ["[?:arg:{sub},]?", new Rule.List({ promote: true, argument: "arg", optional: true, item: new Rule.Subrule("sub"), delimiter: new Rule.Symbol(",") }) ],
        ["[?:arg:{sub},]*", new Rule.Repeat({ promote: true, argument: "arg", optional: true, repeat: new Rule.List({ item: new Rule.Subrule("sub"), delimiter: new Rule.Symbol(",") }) }) ],
      ]
    }
  ]
})



rulex.defineRule({
  name: "choices",
  alias: "rule",
  rules: [
    testLocation,
    new Rule.NestedSplit({
      argument: "split",
      start: new Rule.Symbol("("),
      end: new Rule.Symbol(")"),
      delimiter: new Rule.Symbol("|"),
      prefix: new Rule.Sequence({ rules: [ testLocation, promote, argument ], optional: true }),
      rule: new Rule.Subrule({ subrule: "statement", argument: "choices" }),
    }),
    repeatFlag
  ],
  constructor: class rulex_choices extends Rule.Sequence {
    compile(match) {
      // combine main results from nested split
      const results = { ...match.results, ...match.results.split };
      let { choices } = results;
      let rule;

      // If all choices are single keywords, combine
      if (choices.length > 1 && choices.every(rule => rule instanceof Rule.Keyword && !rule.isAdorned)) {
        rule = new Rule.Keyword(choices.map(rule => rule.literal));
      }
      // If we got exactly one choice which is not a sequence, use that.
      // Note that the choice's flags will "beat" the rule's flags if they conflict.
      else if (choices.length === 1 && !(choices[0] instanceof rulex.statement)) {
        rule = choices[0];
      }
      else {
        rule = new Rule.Choice({ rules: choices });
      }
      return rulex.applyFlags(rule, results);
    }
  },
  tests: [
    {
      title: "single rule in a choice block",
      compileAs: "rule",
      skip: true,
      tests: [
        ["", undefined],
        ["()", new Rule.Symbol("(")],

        // If only one rule matched, return that rule
        ["(>)", new Rule.Symbol(">")],
        ["(word)", new Rule.Keyword("word")],
        ["({sub})", new Rule.Subrule("sub")],
        ["([{sub},])", new Rule.List({ item: new Rule.Subrule("sub"), delimiter: new Rule.Symbol(",") }) ],

        // Pass flags whether they were set on the choices or the single rule (a bit confusing)
        ["(…{sub})", new Rule.Subrule({ subrule: "sub", testLocation: ANYWHERE })],
        ["(?:{sub})", new Rule.Subrule({ subrule: "sub", promote: true })],
        ["({?:sub})", new Rule.Subrule({ subrule: "sub", promote: true })],
        ["(arg:{sub})", new Rule.Subrule({ subrule: "sub", argument: "arg" })],
        ["({arg:sub})", new Rule.Subrule({ subrule: "sub", argument: "arg" })],
        ["({sub}?)", new Rule.Subrule({ subrule: "sub", optional: true })],
        ["({sub})?", new Rule.Subrule({ subrule: "sub", optional: true })],
        ["({sub}+)", new Rule.Repeat({ repeat: new Rule.Subrule({ subrule: "sub" }) })],
        ["({sub}*)", new Rule.Repeat({ optional: true, repeat: new Rule.Subrule({ subrule: "sub" }) })],

        // consolidate multiple keywords
        ["(a|b|c)?", new Rule.Keyword({ literal:["a","b","c"], optional: true })],
        ["(a|b|c?)",
          new Rule.Choice(
            new Rule.Keyword("a"),
            new Rule.Keyword("b"),
            new Rule.Keyword({ literal: "c", optional: true })
          )],
      ]
    },
    {
      title: "multiple choices",
      compileAs: "rule",
      tests: [
        ["(>|a)", new Rule.Choice(new Rule.Symbol(">"), new Rule.Keyword("a"))],
        ["(?:>|a)", new Rule.Choice({ promote: true, rules:[ new Rule.Symbol(">"), new Rule.Keyword("a") ] })],

        ["(…>|a)", new Rule.Choice({ testLocation: ANYWHERE, rules:[ new Rule.Symbol(">"), new Rule.Keyword("a") ] })],
        ["(^?:>|a)", new Rule.Choice({ testLocation: AT_START, promote: true, rules:[ new Rule.Symbol(">"), new Rule.Keyword("a") ] })],

        ["(arg:>|a)", new Rule.Choice({ argument: "arg", rules:[ new Rule.Symbol(">"), new Rule.Keyword("a") ] })],
        ["(?:arg:>|a)", new Rule.Choice({ promote: true, argument: "arg", rules:[ new Rule.Symbol(">"), new Rule.Keyword("a") ] })],

        ["(>|a)?", new Rule.Choice({ optional: true, rules:[ new Rule.Symbol(">"), new Rule.Keyword("a") ] })],
        ["(>|a)*", new Rule.Repeat({ optional: true, repeat: new Rule.Choice({ rules:[ new Rule.Symbol(">"), new Rule.Keyword("a") ] }) })],
        ["(>|a)+", new Rule.Repeat({ repeat: new Rule.Choice({ rules:[ new Rule.Symbol(">"), new Rule.Keyword("a") ] }) })],

        // flags get promoted to the repeat
        ["(…?:arg:>|a)?", new Rule.Choice({ testLocation: ANYWHERE, promote: true, argument: "arg", optional: true, rules:[ new Rule.Symbol(">"), new Rule.Keyword("a") ] })],
        ["(…?:arg:>|a)*", new Rule.Repeat({ testLocation: ANYWHERE, promote: true, argument: "arg", optional: true, repeat: new Rule.Choice({ rules:[ new Rule.Symbol(">"), new Rule.Keyword("a") ] }) })],
      ]
    },
    {
      title: "nested choices",
      compileAs: "rule",
      tests: [
        ["(>|(b|c|d))", new Rule.Choice(new Rule.Symbol(">"), new Rule.Keyword(["b","c","d"])) ],
        ["(>|({sub}|ab))",
          new Rule.Choice(
            new Rule.Symbol(">"),
            new Rule.Choice(new Rule.Subrule("sub"), new Rule.Keyword("ab"))
          )],
      ]
    }
  ]
})


// Statement constructor -- separate because it's referenced in `choices.compile()`
rulex.statement = class rulex_statement extends Rule.Repeat {
  @proto name = "statement";
  @proto repeat = new Rule.Subrule("rule");
  compile(match) {
    const matched = match.matched.map(match => match.compile());
    let rules = [];
    for (let start = 0, rule; rule = matched[start]; start++) {
      // Consolidate sequences
      if (rule instanceof Rule.Sequence && !rule.isAdorned) {
        rules.push(...rule.rules);
        continue;
      }
      // Consolidate runs of literals:
      // Ignore anything that's not a Literal or literals that are "adorned"
      if (rule instanceof Rule.Literal && !rule.isAdorned) {
        let end = start;
        // figure out how long the run of the same type is
        for (let next; next = matched[end + 1]; end++) {
          if (!(next instanceof rule.constructor) || next.isAdorned) break;
        }
        if (end > start) {
          const literals = matched.slice(start, end + 1).map(rule => rule.literal);
          rule = rule instanceof Rule.Keyword
            ? new Rule.Keywords({ literals })
            : new Rule.Symbols({ literals });
          start = end;
        }
      }
      rules.push(rule);
    }

    // If we're down to just one rule, just return that.
    if (rules.length === 1) return rules[0];

    return new Rule.Sequence(rules);
  }
}

// Sequence as a statement -- our top-level rule.
// NO test rule, otherwise we can't start a statement with a special character.
// Match a long list of rules.
// TODO: `consume all tokens`...
rulex.defineRule({
  constructor: rulex.statement,
  tests: [
    {
      title: "sequences",
      showAll: true,
      tests: [
        ["aa bb cc", new Rule.Keywords("aa", "bb", "cc") ],
        ["aa {bb} cc",
          new Rule.Sequence(
            new Rule.Keyword("aa"),
            new Rule.Subrule("bb"),
            new Rule.Keyword("cc"),
          )
        ],
        ["aa? {?:bb} cc",
          new Rule.Sequence(
            new Rule.Keyword({ literal: "aa", optional: true }),
            new Rule.Subrule({ subrule: "bb", promote: true }),
            new Rule.Keyword("cc"),
          )
        ],
        ["aa? (bb|>)",
          new Rule.Sequence(
            new Rule.Keyword({ literal: "aa", optional: true }),
            new Rule.Choice({ rules:[ new Rule.Keyword("bb"), new Rule.Symbol(">") ]})
          )
        ],
      ]
    },
    {
      title: "consolidate multiple keywords and symbols",
      showAll: true,
      tests: [
        [">=", new Rule.Symbols([">", "="])],
        [">(=)?",
          new Rule.Sequence(
            new Rule.Symbol({ literal: ">" }),
            new Rule.Symbol({ literal: "=", optional: true})
          )
        ],

        ["a b c", new Rule.Keywords(["a", "b", "c"])],
        ["a? b c",
          new Rule.Sequence(
            new Rule.Keyword({ literal: "a", optional: true }),
            new Rule.Keywords(["b", "c"])
          )
        ],
        ["a b? c",
          new Rule.Sequence(
            new Rule.Keyword("a"),
            new Rule.Keyword({ literal: "b", optional: true }),
            new Rule.Keyword("c")
          )
        ],
        ["a b c?",
          new Rule.Sequence(
            new Rule.Keywords(["a", "b"]),
            new Rule.Keyword({ literal: "c", optional: true }),
          )
        ],
      ]
    }
  ]
});