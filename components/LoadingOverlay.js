import React from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

export default function LoadingOverlay() {
  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.text}>Analyzing Image...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
  },
  text: {
    marginTop: 15,
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
