//
//	# Rules for creating variables, property access, etc
//

import Parser from "../../Parser";
import Rule from "../../Rule";

// Create "statements" parser.
const parser = Parser.forModule("statements");
export default parser;

parser.defineRules(
  //
  //	## Returns
  //

  // Return a value
  {
    name: "return_statement",
    alias: "statement",
    syntax: "return {expression}",
    constructor: class return_statement extends Rule.Sequence {
      toSource() {
        let { expression } = this.results;
        return `return ${expression}`;
      }
    },
    tests: [
      {
        compileAs: "statement",
        tests: [
          ["return thing", "return thing"],
        ]
      },
    ]
  },

  //
  //	## Assignment
  //

  //TODO: distinguish between `new_identifier` and `scoped_identifier`?
  {
    name: "assignment",
    alias: ["statement", "mutatesScope"],
    syntax: [
      "{thing:expression} = {value:expression}",
      "set {thing:expression} to {value:expression}",
      "put {value:expression} into {thing:expression}"
    ],
    constructor: class assignment extends Rule.Sequence {
      toSource() {
        let { thing, value } = this.results;
        // TODO: declare identifier if not in scope, etc
        return `${thing} = ${value}`;
      }
    },
    tests: [
      {
        compileAs: "statement",
        tests: [
          ["thing = yes", "thing = true"],
          ["set thing to yes", "thing = true"],
          ["put yes into thing", "thing = true"],
        ]
      },
    ]
  },

  {
    name: "get_value",
    alias: ["statement", "mutatesScope"],
    syntax: "get {value:expression}",
    constructor: class get_value extends Rule.Sequence {
      toSource() {
        let { value } = this.results;;
        return `var it = ${value}`
      }
    },
    tests: [
      {
        title: "correctly matches ",
        compileAs: "statement",
        tests: [
          ["get thing", "var it = thing"],
        ]
      },
    ]
  },

);