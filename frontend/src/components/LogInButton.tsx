import React from "react";
import classes from "./LogInButton.module.css";

interface LogInButtonProps {
  buttonStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
  submitting?: boolean;
  onClick?: () => void;
}

export function LogInButton(props: LogInButtonProps) {
  return (
    <button
      className={classes.primaryButton}
      style={props.buttonStyle}
      type="submit"
      onClick={props.onClick}
    >
      <span className={classes.primaryButtonText} style={props.textStyle}>
        {props.submitting ? "Logging In...." : "Log In"}
      </span>
    </button>
  );
}
