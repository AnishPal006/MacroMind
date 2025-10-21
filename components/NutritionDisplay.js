import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator, // Keep this if you have the loading state here
} from "react-native";

// No changes to props needed for this fix
export default function NutritionDisplay({
  data,
  onClose,
  closeButtonLabel = "CLOSE",
}) {
  // --- Error Handling --- (Keep existing)
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
            {/* Use the prop, or default for error */}
            <Text style={styles.closeButtonText}>
              {closeButtonLabel || "TRY AGAIN"}
            </Text>
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
    healthAdvice,
  } = data;

  // --- Helper functions for health advice styling --- (Keep existing)
  const getHealthAdviceStyle = (suitability) => {
    /* ... */
  };
  const getHealthAdviceIcon = (suitability) => {
    /* ... */
  };

  return (
    <View style={styles.modalOverlay}>
      {/* Apply the container style directly to SafeAreaView */}
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.productName}>{productName}</Text>
          <Text style={styles.summary}>{summary}</Text>

          {/* --- Macronutrients Grid --- */}
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

          {/* --- Detailed Nutrients --- */}
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

          {/* --- Additional Info --- */}
          {additionalInfo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Info</Text>
              <Text style={styles.additionalInfoText}>{additionalInfo}</Text>
            </View>
          )}

          {/* --- Health Advice Section --- */}
          {healthAdvice && (
            <View style={[styles.section, styles.healthAdviceSectionBase]}>
              <View
                style={[
                  styles.healthAdviceContent,
                  getHealthAdviceStyle(healthAdvice.suitability),
                ]}
              >
                <Text style={[styles.sectionTitle, styles.healthAdviceTitle]}>
                  {getHealthAdviceIcon(healthAdvice.suitability)} Health Advice
                </Text>
                <Text style={styles.healthAdviceText}>
                  {healthAdvice.reason}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* This button needs to be above the App.js nav bar */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>{closeButtonLabel}</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.75)", // Slightly darker overlay
    justifyContent: "flex-end", // Align content to the bottom
  },
  container: {
    backgroundColor: "#f0f4f8", // Background for the content sheet
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%", // Limit height
    // *** ADD PADDING BOTTOM HERE ***
    // Estimate the height of your bottom nav bar. Let's try 70.
    paddingBottom: 70, // This pushes everything inside the SafeAreaView up
  },
  scrollContent: {
    padding: 24, // Padding for the scrollable content itself
    // paddingBottom: 40 // Remove this if paddingBottom in container is enough
  },
  productName: {
    fontSize: 26, // Slightly smaller
    fontWeight: "bold",
    textAlign: "center",
    color: "#1f2937",
    marginBottom: 4, // Added margin bottom
  },
  summary: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginTop: 4, // Reduced margin top
    marginBottom: 20, // Reduced margin bottom
  },
  macroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12, // Reduced margin
  },
  macroCard: {
    width: "48%",
    padding: 14, // Slightly reduced padding
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  macroLabel: {
    fontSize: 13, // Smaller label
    fontWeight: "600",
    color: "#4b5563",
  },
  macroValue: {
    fontSize: 22, // Smaller value
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 4,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000", // Optional: Add subtle shadow to sections
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 8,
  },
  listItem: {
    fontSize: 15, // Slightly smaller
    color: "#4b5563",
    marginBottom: 5, // Increased spacing
    lineHeight: 22, // Improve readability
  },
  additionalInfoText: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: "#007AFF",
    padding: 16, // Slightly smaller padding
    // Use margin Horizontal for spacing from edges, marginBottom handled by container paddingBottom
    marginHorizontal: 24,
    marginTop: 12, // Space above the button
    // marginBottom: 24 // Let container padding handle this
    borderRadius: 25, // Rounded corners
    alignItems: "center",
    shadowColor: "#000", // Add shadow to button
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16, // Smaller text
    fontWeight: "bold",
  },
  errorTitle: {
    fontSize: 22, // Smaller error title
    fontWeight: "bold",
    textAlign: "center",
    color: "#1f2937",
    marginTop: 40,
    marginBottom: 10, // Added margin
  },
  errorText: {
    fontSize: 15, // Smaller error text
    color: "#4b5563",
    textAlign: "center",
    marginVertical: 15, // Adjusted margin
    paddingHorizontal: 30,
    lineHeight: 22, // Improve readability
  },
  // --- Health Advice Styles --- (Keep these as they were)
  healthAdviceSectionBase: {
    padding: 0,
    backgroundColor: "white",
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  healthAdviceContent: {
    padding: 16,
    borderLeftWidth: 5,
  },
  healthAdviceTitle: {
    color: "#1f2937", // Example color
    // Inherits sectionTitle styles otherwise
  },
  healthAdviceText: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
  },
  healthAdviceGood: {
    backgroundColor: "#f0fdf4",
    borderColor: "#22c55e",
  },
  healthAdviceBad: {
    backgroundColor: "#fef2f2",
    borderColor: "#ef4444",
  },
  healthAdviceNeutral: {
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
  },
  adviceLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f3f4f6",
  },
  adviceLoadingText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#6b7280",
  },
});
