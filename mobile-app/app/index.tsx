import { Text, View } from "react-native";
import {QRCodeSVG} from 'qrcode.react';

export default function Index() {
  // mobile app - phones
  // ipad app
  // admin website - mrs merrims
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <QRCodeSVG value="https://www.google.com" />
      <Text>sakljfasdkl app/index.tsx to edit this screen.</Text>
    </View>
  );
}