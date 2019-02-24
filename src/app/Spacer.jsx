//////////////////////////////
//
//  <Spacer> component for use with oak.
//
//////////////////////////////

import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";

import "./Spacer.less";

export default function Spacer(props) {
  const {
    className,
    appearance, size, width, height,
    inline, fluid, tiny, small, medium, large, huge, massive
  } = props;

  const spacerProps = {
    className: classNames(className, "oak", size, appearance,
                          { inline, fluid },
                          "spacer"),
    style: {
      width,
      height,
    }
  }

  return <div {...spacerProps}/>;
}

Spacer.propTypes = {
  className: PropTypes.string,
  appearance: PropTypes.string,
  size: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,

  inline: PropTypes.bool,
  fluid: PropTypes.bool,

};

Spacer.defaultProps = {
  size: "medium"
}
