import { useEffect } from "react";
import { View, Text } from "react-native";
import { healthCheck } from "./src/services/api";

export default function App() {
  useEffect(() => {
    healthCheck().then(console.log).catch(console.error);
  }, []);

  return (
    <View style={{flex: 1,justifyContent: "center",alignItems: "center",}}>
      <Text>Lumina Lens 🚀</Text>
    </View>
  );
}