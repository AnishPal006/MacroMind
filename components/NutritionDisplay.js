import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";

export default function NutritionDisplay({
  data,
  onClose,
  closeButtonLabel = "Close",
}) {
  if (!data || !data.productName) {
    return (
      <Modal
        transparent
        animationType="fade"
        visible={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.container}>
            <View style={styles.errorIconContainer}>
              <Feather name="alert-circle" size={48} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Analysis Failed</Text>
            <Text style={styles.errorText}>
              The AI could not recognize a food product or its nutrition label.
              Please try again with a clearer image.
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>
                {closeButtonLabel === "CLOSE" ? "Try Again" : closeButtonLabel}
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
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

  const getHealthAdviceStyle = (suitability) => {
    switch (suitability?.toLowerCase()) {
      case "good":
        return styles.healthAdviceGood;
      case "bad":
        return styles.healthAdviceBad;
      default:
        return styles.healthAdviceNeutral;
    }
  };

  const getHealthAdviceIcon = (suitability) => {
    switch (suitability?.toLowerCase()) {
      case "good":
        return <Feather name="check-circle" size={18} color="#10B981" />;
      case "bad":
        return <Feather name="alert-triangle" size={18} color="#EF4444" />;
      default:
        return <Feather name="info" size={18} color="#F59E0B" />;
    }
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.container}>
          {/* Drag Indicator Pill */}
          <View style={styles.dragPill} />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.productName}>{productName}</Text>
            <Text style={styles.summary}>{summary}</Text>

            {/* --- Macronutrients Grid --- */}
            <View style={styles.macroGrid}>
              {/* Highlighted Calories Card */}
              <View style={[styles.macroCard, { backgroundColor: "#EDF5D1" }]}>
                <Feather
                  name="zap"
                  size={20}
                  color="#111827"
                  style={styles.macroIcon}
                />
                <Text style={styles.macroValue}>
                  {macronutrients?.calories || "0"}
                </Text>
                <Text style={styles.macroLabel}>Calories</Text>
              </View>
              <View style={styles.macroCard}>
                <Feather
                  name="target"
                  size={20}
                  color="#10B981"
                  style={styles.macroIcon}
                />
                <Text style={styles.macroValue}>
                  {macronutrients?.protein || "0g"}
                </Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroCard}>
                <Feather
                  name="wind"
                  size={20}
                  color="#3B82F6"
                  style={styles.macroIcon}
                />
                <Text style={styles.macroValue}>
                  {macronutrients?.carbohydrates || "0g"}
                </Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroCard}>
                <Feather
                  name="droplet"
                  size={20}
                  color="#EF4444"
                  style={styles.macroIcon}
                />
                <Text style={styles.macroValue}>
                  {macronutrients?.fat || "0g"}
                </Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>

            {/* --- Detailed Nutrients --- */}
            {otherNutrients?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Detailed Nutrients</Text>
                <View style={styles.nutrientList}>
                  {otherNutrients.map((item, index) => (
                    <View key={index} style={styles.listItemContainer}>
                      <View style={styles.bulletPoint} />
                      <Text style={styles.listItem}>{item}</Text>
                    </View>
                  ))}
                </View>
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
                  <View style={styles.healthAdviceHeader}>
                    {getHealthAdviceIcon(healthAdvice.suitability)}
                    <Text
                      style={[styles.sectionTitle, styles.healthAdviceTitle]}
                    >
                      Health Insights
                    </Text>
                  </View>
                  <Text style={styles.healthAdviceText}>
                    {healthAdvice.reason}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* THE UPDATED LIME GREEN BUTTON */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{closeButtonLabel}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#F8FAF9", // Matched App Background
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  dragPill: {
    width: 40,
    height: 5,
    backgroundColor: "#D1D5DB",
    borderRadius: 5,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 },

  productName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  summary: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "600",
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
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    alignItems: "flex-start",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  macroIcon: { marginBottom: 8 },
  macroValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  macroLabel: { fontSize: 13, fontWeight: "600", color: "#6B7280" },

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },

  nutrientList: { marginTop: 4 },
  listItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    marginRight: 12,
  },
  listItem: { fontSize: 15, color: "#4B5563", fontWeight: "600" },
  additionalInfoText: { fontSize: 15, color: "#4B5563", lineHeight: 22 },

  healthAdviceSectionBase: {
    padding: 0,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  healthAdviceContent: { padding: 20, borderLeftWidth: 6 },
  healthAdviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  healthAdviceTitle: { marginBottom: 0, marginLeft: 8 },
  healthAdviceText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    marginTop: 4,
    fontWeight: "500",
  },
  healthAdviceGood: { backgroundColor: "#F0FDF4", borderLeftColor: "#10B981" },
  healthAdviceBad: { backgroundColor: "#FEF2F2", borderLeftColor: "#EF4444" },
  healthAdviceNeutral: {
    backgroundColor: "#FFFBEB",
    borderLeftColor: "#F59E0B",
  },

  // UPDATED BUTTON DESIGN
  closeButton: {
    backgroundColor: "#D4EB9B", // Lime Green Signature!
    paddingVertical: 18,
    marginHorizontal: 24,
    marginTop: 10,
    borderRadius: 16,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#111827", // Dark Text
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  errorIconContainer: { alignItems: "center", marginTop: 30, marginBottom: 16 },
  errorTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    color: "#111827",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginHorizontal: 30,
    marginBottom: 30,
    lineHeight: 22,
  },
});
