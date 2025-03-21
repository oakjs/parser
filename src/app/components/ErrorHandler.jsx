/* eslint-disable react/prop-types */
import React from "react"

/**
 * Generic `ErrorHandler` component.
 * DOCME
 */
export class ErrorHandler extends React.Component {
  /**
   * Component used to draw a wrapper around `Component` or `ErrorComponent`.
   * Default is just to return the `contents` passed in.
   * - `component` is the rendered Component or ErrorComponent
   * - `error` is the error, if any
   * - `props` are props passed in to this element
   */
  Wrapper({ component, error, props }) {
    return component
  }

  /**
   * Component or Fn which should be used to render your thing if all is well.
   * You'll be passed all of the props as passed to the root element and:
   *  - `wrapperRef` DOM ref to the wrapper element.
   */
  Component(props) {
    return null
  }

  /**
   * Component or Fn which should be used to render an error.
   * - `error` is the error which was caught
   * - will also contain all `props` passed to the root element.
   */
  ErrorComponent({ error }) {
    return <h4>Error: {error.message}</h4>
  }

  /**
   * You may want to clear `state.error` if we re-render and one or more props change.
   * Something like:
   *  `static getDerivedStateFromProps(props, oldState) {`
   *  `  const newState = { relevant: props.someRelevantProp }`
   *  `  if (oldState.relevant !== newState.relevant) newState.error = null`
   *  `  return newState`
   *  `}`
   */
  static getDerivedStateFromProps(props, oldState) {
    return undefined
  }

  /** Override to do something when we catch an error. */
  componentDidCatch(error, errorInfo) {}

  //////////////
  // Generic stuff below this line
  ///////////////

  state = { error: undefined }
  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    const {
      props,
      state: { error }
    } = this
    const component = error
      ? React.createElement(this.ErrorComponent, { ...props, error })
      : React.createElement(this.Component, props)
    return React.createElement(this.Wrapper, { component, error, props })
  }
}
