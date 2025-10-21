// screens/ScannerScreen.js

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet, // Ensure StyleSheet is imported
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform, // Ensure Platform is imported
  KeyboardAvoidingView, // Ensure KeyboardAvoidingView is imported
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import apiService from "../services/api";
import PermissionsNotice from "../components/PermissionsNotice";
import LoadingOverlay from "../components/LoadingOverlay";
import NutritionDisplay from "../components/NutritionDisplay"; // Ensure NutritionDisplay is imported

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState(null); // Data for NutritionDisplay
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // For displaying errors within the screen
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [mealType, setMealType] = useState("lunch"); // Default meal type
  const [quantityGrams, setQuantityGrams] = useState("100"); // Default quantity
  const [capturedPhoto, setCapturedPhoto] = useState(null); // Store captured photo details
  const cameraRef = useRef(null);

  // Function to take picture
  const handleScan = async () => {
    if (!cameraRef.current) return;

    setError(null); // Clear previous errors
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7, // Adjust quality as needed
        // base64: true, // Not needed if using URI upload
      });
      setCapturedPhoto(photo); // Store photo info (includes URI)
      setShowMealTypeModal(true); // Show modal for meal type/quantity
    } catch (err) {
      console.error("Camera Error:", err);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    }
  };

  // Function to submit the scan data to the backend
  const handleSubmitScan = async () => {
    if (!capturedPhoto || !quantityGrams || !mealType) {
      Alert.alert("Error", "Missing scan details.");
      return;
    }

    setShowMealTypeModal(false); // Close modal
    setIsLoading(true); // Show loading overlay
    setError(null); // Clear previous errors
    setScannedData(null); // Clear previous display data

    try {
      // Call the API service function for image scanning
      const response = await apiService.scanFoodByImage(
        capturedPhoto.uri,
        mealType,
        parseFloat(quantityGrams) // Ensure quantity is a number
      );

      // --- Process SUCCESSFUL response ---
      if (response.success && response.data?.scan) {
        const scanData = response.data.scan; // Contains scan details including health advice
        const foodData = scanData.food; // Associated food data
        const nutritionData = scanData.nutrition; // Calculated nutrition for the quantity

        // Check if essential data is present
        if (!foodData || !nutritionData) {
          throw new Error("Incomplete scan data received from server.");
        }

        // *** CORRECTLY Construct healthAdvice object from scanData ***
        const healthAdviceObject =
          scanData.healthSuitability && scanData.healthReason
            ? {
                suitability: scanData.healthSuitability,
                reason: scanData.healthReason,
              }
            : {
                suitability: "neutral",
                reason: "Suitability analysis not available.",
              }; // Default/fallback

        // Construct the object needed by NutritionDisplay
        const transformedData = {
          productName: foodData.name || "Unknown Food",
          summary: `${nutritionData.calories || "N/A"} calories per ${
            scanData.quantityGrams || quantityGrams
          }g serving`,
          imageUrl: scanData.imageUrl
            ? `${process.env.EXPO_PUBLIC_API_URL.replace("/api", "")}${
                scanData.imageUrl
              }`
            : null, // Add image URL if available
          macronutrients: {
            calories: `${nutritionData.calories || "N/A"} kcal`,
            protein: `${nutritionData.protein || "N/A"}g`,
            carbohydrates: `${nutritionData.carbs || "N/A"}g`, // Use 'carbs' key from backend calculation
            fat: `${nutritionData.fats || "N/A"}g`, // Use 'fats' key from backend calculation
          },
          otherNutrients: [
            `Fiber: ${nutritionData.fiber || "N/A"}g`,
            `Sugar: ${nutritionData.sugar || "N/A"}g`,
            `Sodium: ${nutritionData.sodium || "N/A"}mg`,
            ...(foodData.allergens && foodData.allergens.length > 0
              ? [`Listed Allergens: ${foodData.allergens.join(", ")}`]
              : []),
          ],
          additionalInfo: scanData.allergenWarning
            ? `⚠️ Allergen Warning: Contains potential allergens relevant to you.` // Use the scan's warning
            : `Category: ${foodData.category || "N/A"}`,
          healthAdvice: healthAdviceObject, // <-- Assign the constructed health advice object
        };

        setScannedData(transformedData); // Set state to display the nutrition info

        // --- Handle FAILED API response ---
      } else {
        // Trigger error display in NutritionDisplay
        setScannedData({ productName: null });
        setError(
          response.message ||
            "Analysis failed. Please ensure the image is clear and try again."
        );
      }
    } catch (err) {
      console.error("Scanning Error:", err);
      // Trigger error display in NutritionDisplay
      setScannedData({ productName: null });
      // Show specific error if available, otherwise generic message
      setError(
        err.message === "Network request failed"
          ? "Network Error: Could not connect to the server."
          : err.message ||
              "An error occurred during scanning. Please try again."
      );
    } finally {
      setIsLoading(false); // Hide loading overlay
      setCapturedPhoto(null); // Clear captured photo
      // Optionally reset meal type and quantity for next scan
      // setMealType("lunch");
      // setQuantityGrams("100");
    }
  };

  // --- Render Logic ---

  if (!permission) {
    // Permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Permissions are denied
    return <PermissionsNotice requestPermission={requestPermission} />;
  }

  // Permissions are granted, show camera
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef} />

      {/* Overlay for UI elements */}
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.title}>MacroMind</Text>
          <Text style={styles.subtitle}>Point at a food item and scan</Text>
        </View>

        <View style={styles.bottomContainer}>
          {/* Display error message if present AND NutritionDisplay is not showing */}
          {error && !scannedData && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* *** CONDITIONALLY RENDER THE SCAN BUTTON *** */}
          {!scannedData && ( // Only show button if NutritionDisplay is hidden
            <TouchableOpacity
              style={[
                styles.scanButton,
                isLoading && styles.scanButtonDisabled,
              ]}
              onPress={handleScan}
              disabled={isLoading}
            >
              <Text style={styles.scanButtonText}>
                {isLoading ? "PROCESSING..." : "SCAN FOOD"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modal for Meal Type and Quantity Input */}
      <Modal
        visible={showMealTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowMealTypeModal(false);
          setCapturedPhoto(null); // Clear photo if modal is cancelled
        }}
      >
        <KeyboardAvoidingView // Wrap modal content for keyboard handling
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
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

            <Text style={styles.label}>Estimated Quantity (grams):</Text>
            <TextInput
              style={styles.input}
              value={quantityGrams}
              onChangeText={(text) =>
                setQuantityGrams(text.replace(/[^0-9]/g, ""))
              } // Allow only numbers
              keyboardType="numeric"
              placeholder="e.g., 100"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowMealTypeModal(false);
                  setCapturedPhoto(null); // Clear photo on cancel
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleSubmitScan}
                disabled={!quantityGrams} // Disable if quantity is empty
              >
                <Text style={styles.confirmButtonText}>Confirm & Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Loading Overlay */}
      {isLoading && <LoadingOverlay />}

      {/* Nutrition Display (shows result or error) */}
      {scannedData && (
        <NutritionDisplay
          data={scannedData}
          onClose={() => {
            setScannedData(null); // <-- Hides NutritionDisplay
            setError(null); // <-- Clears any previous error message
          }}
          // Determine label based on success/error
          closeButtonLabel={
            scannedData.productName ? "SCAN ANOTHER" : "TRY AGAIN"
          } // <--- This tells it display "SCAN ANOTHER" or "TRY AGAIN"
        />
      )}
    </View>
  );
}

// --- Styles --- (Ensure StyleSheet is imported)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black", // Camera background
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
    // Use SafeAreaView or adjust padding based on platform/notch
    paddingTop: 60, // Example padding, adjust as needed
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    alignSelf: "center", // Center the header
  },
  title: {
    fontSize: 24, // Smaller title
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14, // Smaller subtitle
    color: "white",
    textAlign: "center",
    marginTop: 2,
  },
  bottomContainer: {
    alignItems: "center",
  },
  scanButton: {
    backgroundColor: "#007AFF", // Blue button
    paddingVertical: 16,
    paddingHorizontal: 35,
    borderRadius: 30, // More rounded
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  scanButtonDisabled: {
    backgroundColor: "#999", // Gray when disabled
  },
  scanButtonText: {
    color: "white",
    fontSize: 16, // Slightly smaller text
    fontWeight: "bold",
    textAlign: "center",
  },
  errorText: {
    color: "white",
    backgroundColor: "rgba(239, 68, 68, 0.8)", // Red background for errors
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 15,
    textAlign: "center",
    fontSize: 14,
    maxWidth: "90%", // Prevent excessive width
  },
  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Darker overlay
    justifyContent: "center", // Center vertically
    alignItems: "center",
    padding: 20, // Padding around the modal content
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15, // Less rounded
    padding: 24,
    paddingTop: 20,
    width: "100%", // Take full width within padding
    maxWidth: 350, // Max width for larger screens
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20, // Smaller title
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#1f2937",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#374151",
  },
  mealTypeButtons: {
    flexDirection: "row",
    flexWrap: "wrap", // Allow wrapping on smaller screens if needed
    gap: 8, // Space between buttons
    marginBottom: 16,
  },
  mealTypeButton: {
    // flex: 1 causes issues with wrapping, adjust sizing if needed
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f3f4f6", // Light gray background
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb", // Light border
  },
  mealTypeButtonActive: {
    backgroundColor: "#dbeafe", // Light blue when active
    borderColor: "#60a5fa", // Blue border when active
  },
  mealTypeButtonText: {
    fontSize: 14,
    color: "#374151", // Darker gray text
    fontWeight: "500",
  },
  mealTypeButtonTextActive: {
    color: "#1d4ed8", // Darker blue text when active
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#f9fafb", // Slightly different input background
    padding: 12, // Adjust padding
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#d1d5db", // Slightly darker border
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12, // Space between buttons
    marginTop: 8,
  },
  cancelButton: {
    flex: 1, // Take half width
    padding: 14, // Adjust padding
    borderRadius: 8,
    backgroundColor: "#e5e7eb", // Gray cancel button
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4b5563", // Darker gray text
  },
  confirmButton: {
    flex: 1, // Take half width
    padding: 14, // Adjust padding
    borderRadius: 8,
    backgroundColor: "#007AFF", // Blue confirm button
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});
