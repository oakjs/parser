//
//  # Rules for inline spell tests.
//

import {
  Rule,
  Spell,
  peek
} from "../all.js";

export default new Spell.Parser({
  module: "tests",
  rules: [
    {
      name: "expect_test",
      alias: ["statement"],
      syntax: "expect {expression} to be {value:expression}",
      testRule: "expect",
      constructor: Spell.Rule.Statement,
      updateScope(scope, match) {
        const { results, groups } = match
        const args = [
          results.expression,
          results.value,
          // TODO: output expression spell for error messages in output
        ]
        const statement = scope.addStatement(`spell.assertEquals(${args.join(", ")})`);
        results.statements.push(statement)
      },
      tests: [
        {
          beforeEach(scope) {
            scope.compile("create a type named thing");
            scope.compile("the thing = a new thing with foo = 'bar'")
          },
          tests: [
            ["expect the foo of the thing to be 'bar'",
             "spell.assertEquals(thing?.foo, 'bar')"],
          ]
        },
      ]
    },
  ]
});