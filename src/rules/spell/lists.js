//
//	# Rules for dealing with lists
//

// TODO: confirm identifiers are plural in some of the below?
// TODO: `list.clone()` to return new list of same type.

import Parser from "../../Parser";
import Rule from "../../Rule";

import { isPlural, singularize } from "../../utils/string";

// Create "lists" parser.
const parser = Parser.forModule("lists");
export default parser;


// WORKING FROM OTHER RULES (testme)
//	`the length of <list>`
//	`<thing> is not? in <list>`
//	`<list> is not? empty`
//	`set item 1 of my-list to 'a'`


// TODO: 	`create list with <exp>, <exp>, <exp>`
// TODO:	`duplicate list`
// TODO:	`duplicate list with <exp>, <exp>, <exp>` ???
// TODO:	`the size of <list>` => will map to `list.size`...
//				- install `size` as an alias to `length`?
// TODO:	`move <thing> to end of <list>` ???
// TODO:	`Set` for a unique list?
// TODO:	typed list?
// TODO:	list which won't take null/undefined


parser.defineRules(
  // Return the length of a list.
  {
    name: "list_length",
    alias: "expression",
    syntax: "the? number of {identifier} in {list:expression}",
    constructor: class list_length extends Rule.Sequence {
      toSource() {
        const { list, identifier } = this.results;
        const singular = singularize(identifier);
        return `spell.lengthOf(${list}, '${singular}')`;
      }
    },
    tests: [
      {
        compileAs: "expression",
        tests: [
          ["number of items in my-list", "spell.lengthOf(my_list, 'item')"],
          ["the number of foos in the foo of the bar", "spell.lengthOf(bar.foo, 'foo')"],
          ["the number of items in [1,2,3]", "spell.lengthOf([1, 2, 3], 'item')"],
        ]
      },
    ]
  },

  // Return the first position of specified item in the list as an array.
  // If item is not found, returns `undefined`.
  // NOTE: this position returned is **1-based**.
  // TODO: `positions`, `last position`, `after...`
  {
    name: "list_position",
    alias: "expression",
    syntax: "the? position of {thing:expression} in {list:expression}",
    constructor: class list_position extends Rule.Sequence {
      toSource() {
        const { thing, list } = this.results;
        return `spell.positionOf(${thing}, ${list})`
      }
    },
    tests: [
      {
        compileAs: "expression",
        tests: [
          ["position of thing in my-list", "spell.positionOf(thing, my_list)"],
          ["the position of thing in the foo of the bar", "spell.positionOf(thing, bar.foo)"],
          ["the position of 'a' in ['a', 'b', 'c']", "spell.positionOf('a', ['a', 'b', 'c'])"],
        ]
      },
    ]
  },

  // Does list start with some value?.
  {
    name: "list_starts_with",
    alias: "expression",
    leftRecursive: true,
    testRule: "starts with",
    syntax: "{list:expression} starts with {expression}",
    constructor: class list_starts_with extends Rule.Sequence {
      toSource() {
        const { list, expression } = this.results;
        return `spell.startsWith(${list}, ${expression})`
      }
    },
    tests: [
      {
        compileAs: "expression",
        tests: [
          ["my-list starts with thing", "spell.startsWith(my_list, thing)"],
          ["[1,2,3] starts with 1", "spell.startsWith([1, 2, 3], 1)"],
        ]
      },
    ]
  },

  // Does list end with some value?.
  {
    name: "list_ends_with",
    alias: "expression",
    leftRecursive: true,
    testRule: "ends with",
    syntax: "{list:expression} ends with {expression}",
    constructor: class list_ends_with extends Rule.Sequence {
      toSource() {
        const { list, expression } = this.results;
        return `spell.endsWith(${list}, ${expression})`
      }
    },
    tests: [
      {
        compileAs: "expression",
        tests: [
          ["my-list ends with thing", "spell.endsWith(my_list, thing)"],
          ["[1,2,3] ends with 1", "spell.endsWith([1, 2, 3], 1)"],
        ]
      },
    ]
  },

  //
  //	Ordinal numbers (first, second, last, etc).
  // TODO: sixty-fifth, two hundred forty ninth... with custom parser?
  //
  {
    name: "ordinal",
    constructor: class ordinal extends Rule.Alternatives {},
    tests: [
      {
        tests: [
          ["first", 1],
          ["second", 2],
          ["third", 3],
          ["fourth", 4],
          ["fifth", 5],
          ["sixth", 6],
          ["seventh", 7],
          ["eighth", 8],
          ["ninth", 9],
          ["tenth", 10],

          ["penultimate", -2],
          ["final", -1],
          ["last", -1],

          ["top", 1],
          ["bottom", -1],
        ]
      },
    ]
  },

  {
    name: "ordinal",
    syntax: "first",
    constructor: class ordinal_first extends Rule.Keywords{
      toSource() { return 1 }
    }
  },

  {
    name: "ordinal",
    syntax: "second",
    constructor: class ordinal_second extends Rule.Keywords{
      toSource() { return 2 }
    }
  },

  {
    name: "ordinal",
    syntax: "third",
    constructor: class ordinal_third extends Rule.Keywords{
      toSource() { return 3 }
    }
  },

  {
    name: "ordinal",
    syntax: "fourth",
    constructor: class ordinal_fourth extends Rule.Keywords{
      toSource() { return 4 }
    }
  },

  {
    name: "ordinal",
    syntax: "fifth",
    constructor: class ordinal_fifth extends Rule.Keywords{
      toSource() { return 5 }
    }
  },

  {
    name: "ordinal",
    syntax: "sixth",
    constructor: class ordinal_sixth extends Rule.Keywords{
      toSource() { return 6 }
    }
  },

  {
    name: "ordinal",
    syntax: "seventh",
    constructor: class ordinal_seventh extends Rule.Keywords{
      toSource() { return 7 }
    }
  },

  {
    name: "ordinal",
    syntax: "eighth",
    constructor: class ordinal_eighth extends Rule.Keywords{
      toSource() { return 8 }
    }
  },

  {
    name: "ordinal",
    syntax: "ninth",
    constructor: class ordinal_ninth extends Rule.Keywords{
      toSource() { return 9 }
    }
  },

  {
    name: "ordinal",
    syntax: "tenth",
    constructor: class ordinal_tenth extends Rule.Keywords{
      toSource() { return 10 }
    }
  },

  {
    name: "ordinal",
    syntax: "penultimate",
    constructor: class ordinal_penultimate extends Rule.Keywords{
      toSource() { return -2 }
    }
  },

  {
    name: "ordinal",
    syntax: "final",
    constructor: class ordinal_final extends Rule.Keywords{
      toSource() { return -1 }
    }
  },

  {
    name: "ordinal",
    syntax: "last",
    constructor: class ordinal_last extends Rule.Keywords{
      toSource() { return -1 }
    }
  },



  // treat list as a stack or queue
  {
    name: "ordinal",
    syntax: "top",
    constructor: class ordinal_top extends Rule.Keywords{
      toSource() { return 1 }
    }
  },

  {
    name: "ordinal",
    syntax: "bottom",
    constructor: class ordinal_bottom extends Rule.Keywords{
      toSource() { return -1 }
    }
  },



  // Index expression: numeric position in some list.
  //	e.g.	`card 1 of the pile`
  //			`card #2 of the pile`
  //			`the first card of the pile`
  //
  // NOTE: Negative numeric positions come from the END of the list.
  //	e.g.	`card -1 of the pile`
  //
  // NOTE: Our positions are **1-based** and Javascript is **0-based**.
  //		 e.g. `item 1 of the array`  = `array[0]`
  {
    name: "position_expression",
    alias: "expression",
    syntax: [
      "{identifier} {position:expression} of {expression}",
      "the {position:ordinal} {identifier} (in|of) {expression}"
    ],
    constructor: class position_expression extends Rule.Sequence{
      toSource() {
        const { identifier, position, ordinal, expression } = this.results;
        return `spell.getItem(${expression}, ${position}, '${identifier}')`;
      }
    },
    tests: [
      {
        compileAs: "expression",
        tests: [
          ["item 1 of my-list", "spell.getItem(my_list, 1, 'item')"],
          ["card 10 of deck", "spell.getItem(deck, 10, 'card')"],
          ["foo n of the foos of the bar", "spell.getItem(bar.foos, n, 'foo')"],

          ["the first item of my-list", "spell.getItem(my_list, 1, 'item')"],
          ["the tenth card of deck", "spell.getItem(deck, 10, 'card')"],
          ["the penultimate word in words", "spell.getItem(words, -2, 'word')"],
        ]
      },
    ]
  },


  // Pick a SINGLE random item from the list.
  // TODO: confirm identifier is plural?
  {
    name: "random_position_expression",
    alias: "expression",
    syntax: "a random {identifier} (of|from|in) {list:expression}",
    constructor: class random_position_expression extends Rule.Sequence {
      toSource() {
        const { list, identifier } = this.results;
        return `spell.getRandomItemOf(${list}, '${identifier}')`;
      }
    },
    tests: [
      {
        compileAs: "expression",
        tests: [
          ["a random item of my-list", "spell.getRandomItemOf(my_list, 'item')"],
          ["a random word in 'some words'", "spell.getRandomItemOf('some words', 'word')"],
          ["a random card from deck", "spell.getRandomItemOf(deck, 'card')"],
        ]
      },
    ]
  },

  // Pick a unique set of random items from the list, returning an array.
  // TODO: `two random items...`
  // TODO: confirm identifier is plural?
  // TODO: `list.clone()` to return new list of same type.
  {
    name: "random_positions_expression",
    alias: "expression",
    syntax: "{number} random {identifier} (of|from|in) {list:expression}",
    constructor: class random_positions_expression extends Rule.Sequence {
      toSource() {
        const { number, list, identifier } = this.results;
        return `spell.getRandomItemsOf(${list}, ${number}, '${identifier}')`;
      }
    },
    tests: [
      {
        compileAs: "expression",
        tests: [
          ["2 random items of my-list", "spell.getRandomItemsOf(my_list, 2, 'items')"],
          ["2 random words in 'some other words'", "spell.getRandomItemsOf('some other words', 2, 'words')"],
          ["3 random cards from deck", "spell.getRandomItemsOf(deck, 3, 'cards')"],
        ]
      },
    ]
  },


  // Range expression.
  // Returns a new list.
  // NOTE: `start` is **1-based**.
  // NOTE: `end` is inclusive!
  {
    name: "range_expression",
    alias: "expression",
    syntax: "{identifier} {start:expression} to {end:expression} (of|in|from) {list:expression}",
    constructor: class range_expression extends Rule.Sequence {
      toSource() {
        const { list, start, end, identifier } = this.results;
        return `spell.getRange(${list}, ${start}, ${end}, '${identifier}')`;
      }
    },
    tests: [
      {
        compileAs: "expression",
        tests: [
          ["item 1 to 2 of my-list", "spell.getRange(my_list, 1, 2, 'item')"],
          ["word 2 to 3 in 'some other words'", "spell.getRange('some other words', 2, 3, 'word')"],
          ["card 1 to 3 from deck", "spell.getRange(deck, 1, 3, 'card')"],
        ]
      },
    ]
  },

  // Alternative form of range expression.
  // Returns a new list.
  {
    name: "ordinal_range_expression",
    alias: "expression",
    syntax: "{ordinal} {number} {identifier} (of|in|from) {list:expression}",
    constructor: class ordinal_range_expression extends Rule.Sequence {
      toSource() {
        const { ordinal, number, list, identifier } = this.results;
        return `spell.slice(${list}, ${ordinal}, ${number}, '${identifier}')`;
      }
    },
    tests: [
      {
        compileAs: "expression",
        tests: [
          ["top 2 items of my-list", "spell.slice(my_list, 1, 2, 'items')"],
          ["first 2 words in 'some other words'", "spell.slice('some other words', 1, 2, 'words')"],
          ["last two cards from deck", "spell.slice(deck, -1, 2, 'cards')"],
        ]
      },
    ]
  },

  // Range expression starting at some item in the list.
  // Returns a new list.
  // If item is not found, returns an empty list. (???)
  {
    name: "range_expression_starting_with",
    alias: "expression",
    syntax: "{identifier} (in|of) {list:expression} starting with {thing:expression}",
    constructor: class range_expression_starting_with extends Rule.Sequence {
      toSource() {
        const { thing, list, identifier } = this.results;
        return `spell.getRange(${list}, spell.positionOf(${thing}, ${list}), undefined, '${identifier}')`;
      }
    },
    tests: [
      {
        compileAs: "expression",
        tests: [
          ["items in my-list starting with it",
           "spell.getRange(my_list, spell.positionOf(it, my_list), undefined, 'items')"],
          ["words in 'some words' starting with 'some'",
           "spell.getRange('some words', spell.positionOf('some', 'some words'), undefined, 'words')"],
        ]
      },
    ]
  },


  // List filter.
  // NOTE: we will singularize `identifier` and use that as the argument to `expression`.
  {
    name: "list_filter",
    alias: "expression",
    syntax: "{identifier} (in|of) {list:expression} where {condition:expression}",
    constructor: class list_filter extends Rule.Sequence {
      toSource() {
        const { identifier, condition, list } = this.results;
        // use singular of identifier for method argument
        const argument = singularize(identifier);
        return `spell.filter(${list}, ${argument} => ${condition}, '${argument}')`;
      }
    },
    tests: [
      {
        compileAs: "expression",
        showAll: true,
//FIXME: choking on too many expressions in a row
skip: true,
        tests: [
          ["items in my-list where the id of the item > 1", "spell.filter(my_list, item => item.id > 1, 'items')"],
          ["words in 'a word list' where word starts with 'a'", ""],
        ]
      },
    ]
  },


  // Set membership (left recursive).
  // NOTE: we will singularize `identifier` and use that as the argument to `expression`.
  {
    name: "list_membership_test",
    alias: "expression",
    syntax: "{list:expression} (operator:has|has no|doesnt have|does not have) {identifier} where {filter:expression}",
    leftRecursive: true,
    testRule: "where",
    constructor: class list_membership_test extends Rule.Sequence {
      toSource() {
        const { identifier, operator, filter, list } = this.results;
        const bang = operator === "has" ? "" : "!";
        // use singular of identifier for method argument
        argument = singularize(identifier);
        return `${bang}spell.any(${list}, ${argument} => ${filter}, '${argument}')`;
      }
    },
    tests: [
      {
        compileAs: "expression",
        showAll: true,
//FIXME: choking on too many expressions in a row
skip: true,
        tests: [
          ["my-list has items where item is 1", "spell.any(my_list, item => item == 1, 'item')"],
          ["my-list has no items where item is 1", "!spell.any(my_list, item => item == 1, 'item')"],
          ["my-list doesnt have items where item is 1", "!spell.any(my_list, item => item == 1, 'item')"],
          ["my-list does not have item is 1", "!spell.any(my_list, item => item == 1, 'item')"],
        ]
      },
    ]
  },

  //
  //	Adding to list (in-place)
  //

  // Add to beginning of list.
  {
    name: "list_prepend",
    alias: "statement",
    syntax: [
      "prepend {thing:expression} to {list:expression}",
      "add {thing:expression} to the (start|front|top) of {list:expression}"
    ],
    constructor: class list_prepend extends Rule.Sequence {
      toSource() {
        const { thing, list } = this.results;
        return `spell.prepend(${list}, ${thing})`;
      }
    },
    tests: [
      {
        compileAs: "statement",
        tests: [
          ["prepend thing to my-list", "spell.prepend(my_list, thing)"],
          ["add thing to the start of my-list", "spell.prepend(my_list, thing)"],
          ["add thing to the front of my-list", "spell.prepend(my_list, thing)"],
          ["add thing to the top of my-list", "spell.prepend(my_list, thing)"],
        ]
      },
    ]
  },

  // Add to end of list.
  {
    name: "list_append",
    alias: "statement",
    syntax: [
      "append {thing:expression} to {list:expression}",
      "add {thing:expression} to (the (end|back) of)? {list:expression}"
    ],
    constructor: class list_append extends Rule.Sequence {
      toSource() {
        const { thing, list } = this.results;
        return `spell.append(${list}, ${thing})`;
      }
    },
    tests: [
      {
        compileAs: "statement",
        tests: [
          ["append thing to my-list", "spell.append(my_list, thing)"],
          ["add thing to my-list", "spell.append(my_list, thing)"],
          ["add thing to my-list", "spell.append(my_list, thing)"],
          ["add thing to the end of my-list", "spell.append(my_list, thing)"],
          ["add thing to the back of my-list", "spell.append(my_list, thing)"],
        ]
      },
    ]
  },

  //
  // Add to middle of list, pushing existing items out of the way.
  //


  // TODO: Add to middle of list, pushing existing items out of the way.
  //       "add {thing:expression} to position {position:expression} of {list:expression}",

  // Add to list before/after something else
  // TODO: `relative_position_expression` rule?
  {
    name: "list_add_relative",
    alias: "statement",
    syntax: "add {thing:expression} to {list:expression} (operator:before|after) {item:expression}",
    constructor: class list_add_relative extends Rule.Sequence {
      toSource() {
        const { thing, item, list, operator } = this.results;
        const position = operator === "before"
          ? `spell.positionOf(${list}, ${item})`
          : `spell.positionOf(${list}, ${item}) + 1`
        return `spell.splice(${list}, ${position}, ${thing})`;
      }
    },
    tests: [
      {
        compileAs: "statement",
        tests: [
          ["add thing to my-list before other-thing",
           "spell.splice(my_list, spell.positionOf(my_list, other_thing), thing)"],
          ["add thing to my-list after other-thing",
           "spell.splice(my_list, spell.positionOf(my_list, other_thing) + 1, thing)"],
        ]
      },
    ]
  },

  //
  //	Removing from list (in-place)
  //

  // Empty list.
  //TODO: make `empty` and/or `clear` a generic statement???
  {
    name: "list_empty",
    alias: "statement",
    syntax: "(empty|clear) {list:expression}",
    constructor: class list_empty extends Rule.Sequence {
      toSource() {
        const { list } = this.results;
        return `spell.clear(${list})`;
      }
    },
    tests: [
      {
        compileAs: "statement",
        tests: [
          ["empty my-list", "spell.clear(my_list)"],
          ["clear the cards of deck", "spell.clear(deck.cards)"],
        ]
      },
    ]
  },

  // Remove one item from list by position.
  {
    name: "list_remove_position",
    alias: "statement",
    syntax: [
      "remove {number:ordinal} {identifier} of {list:expression}",
      "remove {identifier} {number:expression} of {list:expression}",
    ],
    constructor: class list_remove_position extends Rule.Sequence {
      toSource() {
        const { number, list, identifier } = this.results;
        return `spell.removeItem(${list}, ${number}, '${identifier}')`;
      }
    },
    tests: [
      {
        compileAs: "statement",
        tests: [
          ["remove second card of deck", "spell.removeItem(deck, 2, 'card')"],
          ["remove item 4 of my-list", "spell.removeItem(my_list, 4, 'item')"],
        ]
      },
    ]
  },

  // Remove range of things from list.
  // NOTE: `start` is **1-based**.
  // NOTE: `end` is inclusive!
  {
    name: "list_remove_range",
    alias: "statement",
    syntax: [
      "remove {start:ordinal} to {end:ordinal} {identifier} of {list:expression}",
      "remove {identifier} {start:expression} to {end:expression} of {list:expression}",
    ],
    constructor: class list_remove_position extends Rule.Sequence {
      toSource() {
        const { start, end, list, identifier } = this.results;
        return `spell.removeRange(${list}, ${start}, ${end}, '${singularize(identifier)}')`;
      }
    },
    tests: [
      {
        compileAs: "statement",
        tests: [
          ["remove first to third card of deck", "spell.removeRange(deck, 1, 3, 'card')"],
          ["remove items 2 to 4 of my-list", "spell.removeRange(my_list, 2, 4, 'item')"],
        ]
      },
    ]
  },


  // Remove all instances of something from a list.
  {
    name: "list_remove",
    alias: "statement",
    syntax: "remove {thing:expression} from {list:expression}",
    constructor: class list_remove extends Rule.Sequence {
      toSource() {
        const { thing, list } = this.results;
        return `spell.remove(${list}, ${thing})`;
      }
    },
    tests: [
      {
        compileAs: "statement",
        tests: [
          ["remove thing from my-list", "spell.remove(my_list, thing)"],
        ]
      },
    ]
  },

  // Remove all items from list where condition is true.
  // NOTE: we will singularize `identifier` and use that as the argument to `expression`.
  {
    name: "list_remove_where",
    alias: "statement",
    syntax: "remove {identifier} (in|of|from) {list:expression} where {condition:expression}",
    constructor: class list_remove_where extends Rule.Sequence {
      toSource() {
        const { identifier, condition, list } = this.results;
        // use singular of identifier for method argument
        const argument = singularize(identifier);
        return `spell.removeWhere(${list}, ${argument} => ${condition}, '${argument}')`;
      }
    },
    tests: [
      {
        compileAs: "statement",
        tests: [
          ["remove items from list where item is undefined",
           "spell.removeWhere(list, item => (item == undefined), 'item')"],
          ["remove words of text where word starts with 'a'",
           "spell.removeWhere(text, word => spell.startsWith(word, 'a'), 'word')"],
          ["remove cards in deck where the suit of the card is ace",
           "spell.removeWhere(deck, card => (card.suit == ace), 'card')"],
        ]
      },
    ]
  },


  //
  //	Random (in-place) list manipulation.
  //

  // Reverse list in-place.
  {
    name: "list_reverse",
    alias: "statement",
    syntax: "reverse {list:expression}",
    constructor: class list_reverse extends Rule.Sequence {
      toSource() {
        const { list } = this.results;
        return `spell.reverse(${list})`;
      }
    },
    tests: [
      {
        compileAs: "statement",
        tests: [
          ["reverse my-list", "spell.reverse(my_list)"],
        ]
      },
    ]
  },

  // Shuffle list in-place.
  {
    name: "list_shuffle",
    alias: "statement",
    syntax: "(randomize|shuffle) ({identifier} (in|of))? {list:expression}",
    constructor: class list_shuffle extends Rule.Sequence {
      toSource() {
        const { list } = this.results;
        return `spell.shuffle(${list})`;
      }
    },
    tests: [
      {
        compileAs: "statement",
        tests: [
          ["randomize my-list", "spell.shuffle(my_list)"],
          ["shuffle cards of deck", "spell.shuffle(deck)"],
        ]
      },
    ]
  },


  // Iteration
  // TODO: can work for object enumeration as well (maybe with 'of'?)
  // TODO: return values e.g. array.map() ???
  {
    name: "list_iteration",
    alias: "statement",
    syntax: [
      "for (each)? {item:identifier} in {list:expression}:? {statement}?",
      "for (each)? {item:identifier} (and|,) {position:identifier} in {list:expression}:? {statement}?",
    ],
    constructor: class list_iteration extends Rule.BlockStatement {
      toSource() {
        const { item, position, list, statements } = this.results;
        const itemVar = singularize(item);
        if (!position) {
          return `for (const ${itemVar} of ${list}) ${statements}`;
        }
        const positionVar = singularize(position);
        // NOTE: `spell.entries()` must return **1-based** indexes ???
        return `for (const [${positionVar}, ${itemVar}] of spell.entries(${list}) ${statements}`
      }
    },
    tests: [
      {
        compileAs: "statements",
        tests: [
          ["for each card in deck:", "for (const card of deck) {}"],
          ["for item, index in my-list:", "for (const [index, item] of spell.entries(my_list) {}"],

          ["for each card in deck: set the direction of the card to 'down'",
           "for (const card of deck) { card.direction = 'down' }"],
          ["for message, index in messages: add message + index to messages",
           "for (const [index, message] of spell.entries(messages) {\n\tspell.append(messages, (message + index))\n}"],

          ["for each card in deck:\n\tset the direction of the card to 'down'",
           "for (const card of deck) {\n\tcard.direction = 'down'\n}"],
          ["for message and index in messages:\n\tif index is greater than 2 add message to messages",
           "for (const [index, message] of spell.entries(messages) {\n\tif (index > 2) { spell.append(messages, message) }\n}"],
        ]
      },
    ]
  },


);