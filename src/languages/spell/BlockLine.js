import {
  Rule,
} from "./all.js";

// Parse a single line in a block.
// NOTE: we eat whitespace at the start and stick it on `match.whitespace` if found.
// NOTE: we eat a comment at the end and stick it on `match.comment` if found.
//       if ONLY comment was found, that will be the match.
// NOTE: if the parser wants to `outputSource`, match.source will be the input text.
export class BlockLine extends Rule {
  parse(scope, tokens) {
    let start = 0;
    let end = tokens.length;

    // eat whitespace at front if found
    const whitespace = scope.parse(tokens, "eat_whitespace");
    if (whitespace) start = whitespace.length;

    // pop comment off of the end if found
    const last = tokens[tokens.length - 1];
    const comment = scope.parse([last], "comment");
    if (comment) end -= 1;

    // parse the statement
    const remainingTokens = tokens.slice(start, end);
    const statement = scope.parse(remainingTokens, "statement");

    // If no statement and no comment, forget it (ignoring whitespace).
    if (!statement && !comment) return;

    if (statement && statement.length !== remainingTokens.length) {
      scope.warn(`statement didn't match '${Tokenizer.join(remainingTokens,statement.length)}'`);
    }

    // If only comment, return that.
    if (!statement) {
      comment.length = tokens.length;
      return comment;
    }

    // If we got whitespace or comment, add it to the statement;
    if (whitespace) statement.whitespace = whitespace;
    if (comment) statement.comment = comment;

    // If the parser wants to output source, grab tokens now.
    if (scope.parser.outputSource) {
      statement.source = Tokenizer.join(remainingTokens, 0, statement.length);
    }

    // Assume we ate the entire line
    statement.length = tokens.length;
    return statement;
  }
}