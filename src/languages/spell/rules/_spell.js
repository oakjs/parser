import { Spell } from "../all.js";

import core from "./core.js";
import types from "./types.js";
import variables from "./variables.js";
import constants from "./constants.js";
import assignment from "./assignment.js";
import _if_ from "./if.js";
import JSX from "./JSX.js";
import lists from "./lists.js";
import expressions from "./expressions.js";
import math from "./math.js";
import properties from "./properties.js";
import UI from "./UI.js";
import classes from "./classes.js";

// Create parser which combines all of the above...
export const spell = new Spell.Parser({ module: "spell" });

spell.defineRule({ name: "block", constructor: Spell.Rule.Block });
spell.defineRule({ name: "block_line", constructor: Spell.Rule.BlockLine });

// Import the other rules defined above.
spell.import(core, types, variables, constants, assignment, expressions, math, properties, lists, _if_, JSX, UI, classes);