// Export all standard "spell" rules.
import Parser from "../../Parser.js";
import Rule from "../../Rule.js";
import parseRule from "../../RuleSyntax.js";
import Tokenizer from "../../Tokenizer.js";

// Load all standard rules files.
import "./core.js";
import "./if.js";
import "./JSX.js";
import "./lists.js";
import "./operators.js";
import "./statements.js";
import "./types.js";
import "./UI.js";

// Create parser which combines all of the above...
const parser = Parser.forModule("spell");
// ...which depends on rules loaded above...
parser.import("core", "types", "lists", "operators", "if", "statements", "JSX", "UI");
// ...as the default export
export default parser;

// Stick other stuff on `window` for reflection and ad-hoc testing.
if (typeof window !== "undefined") {
	Object.assign(window, {
		Parser,
		parseRule,

		Rule,

		Tokenizer,
		tokenize: Tokenizer.tokenize.bind(exports.Tokenizer),

		parser,
		rules: parser.rules,
		parse: parser.parse.bind(parser),
		compile: parser.compile.bind(parser),
	});
}