import React from 'react';
import classes from './SignInButton.module.css'; // Import the CSS file for styling

// Define the type for the component's props
interface SignInButtonProps {
  onClick: () => void;
  buttonClassName?: string;
  textClassName?: string;
  buttonStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
}

export function SignInButton({ onClick, buttonStyle, textStyle }: SignInButtonProps) {
  return (
    <button 
      className={classes.primaryButton}
      onClick={onClick}
      style={buttonStyle}
    >
      <span 
        className={classes.primaryButtonText}
        style={textStyle}
      >
        Sign In
      </span>
    </button>
  );
}
