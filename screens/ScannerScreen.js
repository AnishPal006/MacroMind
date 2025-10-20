import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import apiService from "../services/api";
import PermissionsNotice from "../components/PermissionsNotice";
import LoadingOverlay from "../components/LoadingOverlay";
import NutritionDisplay from "../components/NutritionDisplay";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [mealType, setMealType] = useState("lunch");
  const [quantityGrams, setQuantityGrams] = useState("100");
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const cameraRef = useRef(null);

  const handleScan = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });
      setCapturedPhoto(photo);
      setShowMealTypeModal(true);
    } catch (err) {
      console.error("Camera Error:", err);
      Alert.alert("Error", "Failed to capture photo");
    }
  };

  const handleSubmitScan = async () => {
    if (!capturedPhoto || !quantityGrams) {
      Alert.alert("Error", "Please enter quantity");
      return;
    }

    setShowMealTypeModal(false);
    setIsLoading(true);
    setError(null);
    setScannedData(null);

    try {
      const response = await apiService.scanFoodByImage(
        capturedPhoto.uri,
        mealType,
        parseFloat(quantityGrams)
      );

      if (response.success) {
        // Transform backend response to match existing NutritionDisplay component
        const transformedData = {
          productName: response.data?.scan?.food?.name || "Food not found",
          summary: `${
            response.data?.scan?.nutrition?.calories || "N/A"
          } calories per ${quantityGrams}g serving`,
          macronutrients: {
            calories: `${
              response.data?.scan?.nutrition?.calories || "N/A"
            } kcal`,
            protein: `${response.data?.scan?.nutrition?.protein || "N/A"}g`,
            carbohydrates: `${response.data?.scan?.nutrition?.carbs || "N/A"}g`,
            fat: `${response.data?.scan?.nutrition?.fats || "N/A"}g`,
          },
          otherNutrients: [
            `Fiber: ${response.data?.scan?.nutrition?.fiber || "N/A"}g`,
            `Sugar: ${response.data?.scan?.nutrition?.sugar || "N/A"}g`,
            `Sodium: ${response.data?.scan?.nutrition?.sodium || "N/A"}mg`,
          ],
          additionalInfo: response.data?.scan?.allergenWarning
            ? `⚠️ Allergen Warning: Contains ${
                response.data?.scan?.detectedAllergens?.join(", ") ||
                "details missing"
              }`
            : `Category: ${response.data?.scan?.food?.category || "N/A"}`,
        };
        setScannedData(transformedData);
      }
    } catch (err) {
      console.error("Scanning Error:", err);
      setError(err.message || "Could not analyze the image. Please try again.");
      Alert.alert("Error", err.message || "Scan failed");
    } finally {
      setIsLoading(false);
      setCapturedPhoto(null);
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return <PermissionsNotice requestPermission={requestPermission} />;
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef} />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.title}>MacroMind</Text>
          <Text style={styles.subtitle}>Point at a food item and scan</Text>
        </View>

        <View style={styles.bottomContainer}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.scanButton, isLoading && styles.scanButtonDisabled]}
            onPress={handleScan}
            disabled={isLoading}
          >
            <Text style={styles.scanButtonText}>
              {isLoading ? "ANALYZING..." : "SCAN PRODUCT"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Meal Type Modal */}
      <Modal
        visible={showMealTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMealTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Scan Details</Text>

            <Text style={styles.label}>Meal Type:</Text>
            <View style={styles.mealTypeButtons}>
              {["breakfast", "lunch", "dinner", "snack"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.mealTypeButton,
                    mealType === type && styles.mealTypeButtonActive,
                  ]}
                  onPress={() => setMealType(type)}
                >
                  <Text
                    style={[
                      styles.mealTypeButtonText,
                      mealType === type && styles.mealTypeButtonTextActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Quantity (grams):</Text>
            <TextInput
              style={styles.input}
              value={quantityGrams}
              onChangeText={setQuantityGrams}
              keyboardType="numeric"
              placeholder="100"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowMealTypeModal(false);
                  setCapturedPhoto(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleSubmitScan}
              >
                <Text style={styles.confirmButtonText}>Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isLoading && <LoadingOverlay />}

      {scannedData && (
        <NutritionDisplay
          data={scannedData}
          onClose={() => setScannedData(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
    padding: 40,
    paddingTop: 80,
  },
  header: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 10,
    borderRadius: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "white",
    textAlign: "center",
    marginTop: 4,
  },
  bottomContainer: {
    alignItems: "center",
  },
  scanButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  scanButtonDisabled: {
    backgroundColor: "#999",
  },
  scanButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorText: {
    color: "white",
    backgroundColor: "rgba(255, 0, 0, 0.6)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#374151",
  },
  mealTypeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  mealTypeButton: {
    flex: 1,
    minWidth: "45%",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  mealTypeButtonActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#007AFF",
  },
  mealTypeButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  mealTypeButtonTextActive: {
    color: "#007AFF",
  },
  input: {
    backgroundColor: "#f3f4f6",
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  confirmButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});
