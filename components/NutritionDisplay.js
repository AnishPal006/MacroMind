import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";

export default function NutritionDisplay({ data, onClose }) {
  if (!data || !data.productName) {
    return (
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.container}>
          <Text style={styles.errorTitle}>Analysis Failed</Text>
          <Text style={styles.errorText}>
            The AI could not recognize a food product or its nutrition label.
            Please try again with a clearer image.
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const {
    productName,
    summary,
    macronutrients,
    otherNutrients,
    additionalInfo,
  } = data;

  return (
    <View style={styles.modalOverlay}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.productName}>{productName}</Text>
          <Text style={styles.summary}>{summary}</Text>

          <View style={styles.macroGrid}>
            <View style={[styles.macroCard, { backgroundColor: "#e0f2fe" }]}>
              <Text style={styles.macroLabel}>Calories</Text>
              <Text style={styles.macroValue}>
                {macronutrients?.calories || "N/A"}
              </Text>
            </View>
            <View style={[styles.macroCard, { backgroundColor: "#dcfce7" }]}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>
                {macronutrients?.protein || "N/A"}
              </Text>
            </View>
            <View style={[styles.macroCard, { backgroundColor: "#fef3c7" }]}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>
                {macronutrients?.carbohydrates || "N/A"}
              </Text>
            </View>
            <View style={[styles.macroCard, { backgroundColor: "#fee2e2" }]}>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>
                {macronutrients?.fat || "N/A"}
              </Text>
            </View>
          </View>

          {otherNutrients?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detailed Nutrients</Text>
              {otherNutrients.map((item, index) => (
                <Text key={index} style={styles.listItem}>
                  • {item}
                </Text>
              ))}
            </View>
          )}

          {additionalInfo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Info</Text>
              <Text style={styles.additionalInfoText}>{additionalInfo}</Text>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>SCAN ANOTHER</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#f0f4f8",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  scrollContent: {
    padding: 24,
  },
  productName: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1f2937",
  },
  summary: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  macroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  macroCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
  },
  macroValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 4,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 8,
  },
  listItem: {
    fontSize: 16,
    color: "#4b5563",
    marginBottom: 4,
  },
  additionalInfoText: {
    fontSize: 16,
    color: "#4b5563",
    lineHeight: 24,
  },
  closeButton: {
    backgroundColor: "#007AFF",
    padding: 18,
    margin: 24,
    marginTop: 12,
    borderRadius: 50,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1f2937",
    marginTop: 40,
  },
  errorText: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginVertical: 20,
    paddingHorizontal: 30,
  },
});
