/* eslint-disable react/prop-types */
import React from "react"

import "./ASTViewer.less"

function highlight(el, delay = 0) {
  setTimeout(() => {
    el.classList.add("highlight")
    setTimeout(() => el.classList.remove("highlight"), 400)
  }, delay)
}

/** Top-level viewer for a ASTNode.
 * Create one of these and it will create <ASTView>s and <TokenView>s underneath it.the
 */
export function ASTViewer({ ast, match, inputOffset }) {
  if (!ast) return null
  // If we're passed a specific `inputOffset`, scroll that line into view and flash its bg.
  React.useLayoutEffect(() => {
    if (typeof inputOffset !== "number" || !match) return
    // get the stack of what was matched, with the inner-most thing FIRST
    const stack = match.matchStackForOffset(inputOffset).reverse()
    // find the lowest item that corresponds to a `line`
    const lineAST = stack.find(_match => _match.rule?.name === "line")
    const lineEl = lineAST && document.querySelector(`.ASTNode[data-start="${lineAST.start}"]`)
    if (!lineEl) return
    // console.warn({ inputOffset, lineAST, lineEl })
    // scroll the `name` thinger into the center of the display
    lineEl.scrollIntoView({ block: "center" })

    // make sure we're scrolled all the way to the left horizontally
    lineEl.closest(".ASTViewer").scrollLeft = 0
    // parent.scrollTo(0, parent.scrollTop)

    // highlight the line element
    highlight(lineEl)

    // highlight NAMEs of bits higher in the stack
    // stack
    //   .slice(0, stack.indexOf(lineAST))
    //   .reverse()
    //   .forEach((item, index) => {
    //     const itemEl = document.querySelector(`.ASTNode.${item.rule?.name}[data-start="${item.start}"] > .name`)
    //     if (itemEl) highlight(itemEl, index * 20)
    //   })
  }, [match, inputOffset])
  return <div className="ASTViewer">{ast.component}</div>
}