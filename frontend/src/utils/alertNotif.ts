
/**
 * Returns a function that displays an error as a window.alert.
 * Used for react query mutations.
 */
export function alertNotif(action: string) {
  return (error: Error) => 
    window.alert(
      `An error occured while running ${action}: ${error.message}`
    )
}