import React from "react";
import classes from "./SignInButton.module.css"; // Import the CSS file for styling

interface SignInButtonProps {
  buttonStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
  submitting?: boolean;
  onClick?: () => void;
}

export function SignInButton(props: SignInButtonProps) {
  return (
    <button
      className={classes.primaryButton}
      style={props.buttonStyle}
      type="submit"
      onClick={props.onClick}
    >
      <span className={classes.primaryButtonText} style={props.textStyle}>
        {props.submitting ? "Signing In...." : "Sign In"}
      </span>
    </button>
  );
}
