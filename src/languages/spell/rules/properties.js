//
//  # Rules for property access.
//

// TODO: constructor
// TODO: mixins / traits / composed classes / annotations

import {
  Rule,
  SpellParser,
  Token,

  pluralize
} from "../all.js";

import identifierBlacklist from "./identifier-blacklist.js";

const parser = new SpellParser({ module: "properties" });
export default parser;

const LOWER_INITIAL_WORD = /^[a-z][\w\-]*$/;

//
//  Property names / expressions
//

// Generic property name -- single word, initial-lower case, not in identifier blacklist.
// You can register multi-word property identifiers manually.
parser.defineRule({
  name: "property",
  pattern: LOWER_INITIAL_WORD,
  blacklist: identifierBlacklist,
  // convert dashes to underscores
  valueMap(value) {
    return (""+value).replace(/-/g, "_");
  }
});


parser.defineRule({
  name: "the_property_of",
  alias: "property_accessor",
  syntax: "the {property} of",
  testRule: "the",
  compile(scope, match) {
    return match.results.property;
  },
});


parser.defineRule({
  // TODO: multiple identifiers would be cool...
  name: "property_expression",
  alias: ["expression", "single_expression"],
  syntax: "{property_accessor} {expression:single_expression}",
  testRule: "{property_accessor}",    // ???
  compile(scope, match) {
    let { expression, property_accessor } = match.results;
    // TODO: `[xxx]` for non-identifiers
    return `${expression}?.${property_accessor}`;
  },
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["the foo of bar", "bar?.foo"],
        ["the foo of the bar", "bar?.foo"],
        ["the foo of the bar of the baz", "baz?.bar?.foo"],
        ["the foo-bar of the baz", "baz?.foo_bar"]
      ]
    }
  ]
});


// "its" as a synonym for "this"
// TODO: If not in an instance scope, maybe "its" is the first argument?
//       The previous thing in the line?  "set the position of the card to its rank"
parser.defineRule({
  name: "its_property",
  alias: ["expression", "property_accessor", "single_expression"],
  syntax: "its {property}",
  testRule: "its",
  compile(scope, match) {
    const { property } = match.results;
    return `this.${property}`
  },
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["its foo", "this.foo"],
        ["the foo of its bar", "this.bar?.foo"],
      ]
    }
  ]
});


// Properties clause: creates an object with one or more property values.
//  `foo = 1, bar = 2`
//TODO: would like to use `and` but that conflicts with "and" operator
//TODO: don't quote if we don't have to? (ASCII and blacklist only)
//TOOD: multiple lines if > 2 props?
parser.defineRule({
  name: "object_literal_properties",
  syntax: "[({key:property} (?:= {value:expression})?),]",
  compile(scope, match) {
    let props = match.items.map(function(prop) {
      let { key, value } = prop.results;
      if (value) return `"${key}": ${value}`;
      return key;
    });
    return `{ ${props.join(", ")} }`;
  },
  tests: [
    {
      tests: [
        [``, undefined],
        [`a = 1`, `{ "a": 1 }`],
        [`a = 1,`, `{ "a": 1 }`],
        [`a = 1, b = yes, c = "quoted"`, `{ "a": 1, "b": true, "c": "quoted" }`],
        [`a = 1, b = the foo of the bar`, `{ "a": 1, "b": bar?.foo }`]
      ]
    }
  ]
});



//MOVE TO `functions`?
// Arguments clause for methods
//  `with foo` or `with foo and bar and baz`
//TODO: {identifier} = {expression}  => requires `,` instead of `and`
//TODO: `with foo as Type`
//TODO:  `with foo...` for splat?
parser.defineRule({
  name: "args",
  syntax: "with [args:{identifier},]",
  // Returns an array of argument values
  compile(scope, match) {
    const { args } = match.results;
    return args.join(", ");
  },
  tests: [
    {
      tests: [
        ["with animal", "animal"],
        ["with animal, vegetable, mineral", "animal, vegetable, mineral"],
        ["with animal, vegetable, mineral,", "animal, vegetable, mineral"]
      ]
    }
  ]
});
