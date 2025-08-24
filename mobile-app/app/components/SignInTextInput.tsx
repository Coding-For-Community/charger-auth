import { StyleProp, StyleSheet, TextInput, TextInputProps, TextStyle } from "react-native"

export function SignInTextInput(args: TextInputProps) {
  const customStyle = args.style
  delete args.style // Remove style from args to avoid conflicts
  return (
    <TextInput
      style={[styles.input, customStyle]}
      placeholderTextColor="#9ca3af"
      keyboardType="numeric" // Use 'numeric' if the ID is always numbers
      {...args}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db', // Light border color
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 20,
  }
})

