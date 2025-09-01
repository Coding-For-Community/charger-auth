import { LIGHT_BLUE } from "@/lib/colors";
import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from "react-native";

export function SignInButton(args: {
  onPress: () => void, 
  buttonStyle?: StyleProp<ViewStyle>,
  textStyle?: StyleProp<TextStyle>
}) {
  return (
    <TouchableOpacity 
      style={[styles.primaryButton, args.buttonStyle]}
      onPress={args.onPress}
    >
      <Text style={[styles.primaryButtonText, args.textStyle]}>Sign In</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  primaryButton: {
    width: '100%',
    height: 45,
    backgroundColor: LIGHT_BLUE, // A vibrant, accessible blue
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: LIGHT_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8, // For Android shadow
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  }
});