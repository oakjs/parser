/**
 * SpellCore `Events`
 * These serve as a bridge between the generic spellCore base and UIs.
 *
 * TODO: event heiarchy
 * TODO: pass/etc events
 */

import _remove from "lodash/remove"
import global from "global"
import { spellCore } from "."

/**
 * Constructor for an immutable `SpellEvent`
 * You MUST pass at least a string `type`, you can pass any other properties you like.
 * NOTE: you should consider these objects immutable! ???
 */
export class SpellEvent {
  constructor(props) {
    if (typeof props === "string") this.type = props
    else Object.assign(this, props)
    if (typeof this.type !== "string") throw new TypeError(`SpellEvents must be initiallized with a 'type'.`)
  }

  /**
   * Register a `callback` to execute when event is triggered on  `target`.
   * `eventType` is the name of the event to watch (case-insensitive).
   * `callback` is code to execute when triggered, as `callback(<spellEvent>, <target>)`.
   * `target` defauts to `spellCore` but can be any object with an `eventMap`.
   */
  static on(target, eventType, callback) {
    if (!callback) return
    const list = SpellEvent.getEventList(target, eventType, true)
    list.push(callback)
  }

  /**
   * UN-register a `callback` to `target` setup with `spellCore.on()`.
   * `eventType` is the name of the event in question (case-insensitive).
   * `callback` is the previously watched callback.
   * `target` defauts to `spellCore` but can be any object with an `eventMap`.
   */
  static off(target, eventType, callback) {
    if (!callback) return
    const list = SpellEvent.getEventList(target, eventType)
    if (list) _remove(list, (next) => next === callback)
  }

  /**
   * Register a `callback` to execute ONCE when event is triggered on  `target`
   * and then unregister itself.  Same semantics as `on()`.
   */
  static once(target, eventType, callback) {
    if (!callback) return
    function callOnce(event) {
      // remove the event handler FIRST, in case callback errors
      SpellEvent.off(target, eventType, callOnce)
      return callback(event, target)
    }
    SpellEvent.on(target, eventType, callOnce)
  }

  /**
   * Trigger an `event` on some `target`.
   * `event` is a `SpellEvent` or a `string` (which we'll use to create a `SpelLEvent`).
   * `target` defauts to `spellCore` but can be any object with an `eventMap`.
   *
   * Returns map of results from callbacks, or an empty array if no callback registered.
   * If those results are `Promises`, you could `Promise.all()` the results.
   */
  static trigger(target, event, props) {
    if (typeof event === "string") event = new SpellEvent(event)
    if (props) Object.assign(event, props)
    const callbacks = SpellEvent.getEventList(target, event.type)
    let results = []
    if (callbacks) {
      console.info("triggering", event, " on ", target)
      results = [...callbacks].map((callback) => {
        try {
          return callback(event, target)
        } catch (error) {
          // TODO: surface as an `eventError` event?
          console.warn(
            `Error calling event '${event.type}': `,
            error,
            "\ntarget:",
            target,
            "\nevent:",
            event,
            "\ncallback:",
            callback
          )
        }
      })
    }
    // Delegate to `eventParent` if defined
    const { eventParent } = target
    if (eventParent) {
      console.info("delegating to parent", eventParent)
      const parentResults = SpellEvent.trigger(eventParent, event)
      if (parentResults.length) results.push(...parentResults)
    }
    return results
  }

  /**
   * Given an event `target`, return a list of events for `eventType`.
   * If `createIfNecessary` is `true`, we'll create one if it doesn't exist.
   * Otherwise we'll return `undefined`.
   *
   * NOTE: we use a `WeakMap` to store the event handlers here, by `target`.
   * In theory, this should maybe avoid memory leaks. ???
   */
  static EVENT_OBJECT_REGISTRY = new WeakMap()
  static getEventList(target, eventType, createIfNecessary = false) {
    eventType = eventType.toLowerCase()
    let map = SpellEvent.EVENT_OBJECT_REGISTRY.get(target)
    if (!map) {
      if (!createIfNecessary) return undefined
      map = {}
      SpellEvent.EVENT_OBJECT_REGISTRY.set(target, map)
    }
    let list = map[eventType]
    if (!list && createIfNecessary) {
      list = []
      map[eventType] = list
    }
    return list
  }

  /**
   * Make some arbitrary `target` able to deal with events by monkey-patching
   * `on`, `off`, `once` and `trigger` methods.
   * NOTE: To apply for all instances of a class, use `Eventful` HOC below:
   *
   * To apply to a singleton or statically to a class:
   *    `SpellEvent.makeEventful(SingletonOrClass)`
   */
  static instanceMethods = {
    on: {
      value(eventType, callback) {
        SpellEvent.on(this, eventType, callback)
      }
    },
    off: {
      value(eventType, callback) {
        SpellEvent.off(this, eventType, callback)
      }
    },
    once: {
      value(eventType, callback) {
        SpellEvent.once(this, eventType, callback)
      }
    },
    trigger: {
      value(event, props) {
        SpellEvent.trigger(this, event, props)
      }
    }
  }
  static makeEventful(target) {
    Object.defineProperties(target, SpellEvent.instanceMethods)
  }
}
// Make spellCore itself eventful.
SpellEvent.makeEventful(spellCore)

/**
 * Higher-order "mixin" class to allow instances of a class to work with SpellEvents.
 * Usage:  `class MyClass extends Eventful(SomeBaseClass) {...}`
 */
export function Eventful(BaseClass) {
  const newClass = BaseClass ? class Eventful extends BaseClass {} : class Eventful {}
  SpellEvent.makeEventful(newClass.prototype)
  return newClass
}

// debug
global.SpellEvent = SpellEvent
global.Eventful = Eventful
