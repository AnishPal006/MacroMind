import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import apiService from "../services/api";
import PermissionsNotice from "../components/PermissionsNotice";
import LoadingOverlay from "../components/LoadingOverlay";
import NutritionDisplay from "../components/NutritionDisplay";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState("image"); // "image" or "barcode"

  const [scannedData, setScannedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [mealType, setMealType] = useState("lunch");
  const [quantityGrams, setQuantityGrams] = useState("100");

  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [capturedBarcode, setCapturedBarcode] = useState(null);

  // NEW: State to control manual barcode scanning
  const [isBarcodeReady, setIsBarcodeReady] = useState(false);
  const cameraRef = useRef(null);

  const handleCaptureImage = async () => {
    if (!cameraRef.current) return;
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      setCapturedPhoto(photo);
      setShowMealTypeModal(true);
    } catch (err) {
      Alert.alert("Error", "Failed to capture photo.");
    }
  };

  // NEW: Manual trigger for the barcode
  const triggerBarcodeScan = () => {
    setIsBarcodeReady(true);
    setError(null);

    // Auto-reset the button after 3 seconds if no barcode is found
    setTimeout(() => {
      setIsBarcodeReady(false);
    }, 3000);
  };

  const handleBarcodeScanned = ({ type, data }) => {
    // If the user hasn't pressed the button, completely ignore the barcode!
    if (
      scanMode !== "barcode" ||
      !isBarcodeReady ||
      showMealTypeModal ||
      isLoading ||
      scannedData
    )
      return;

    // The moment we get a scan, turn the scanner off so it doesn't fire twice
    setIsBarcodeReady(false);
    setError(null);
    setCapturedBarcode(data);
    setShowMealTypeModal(true);
  };

  const handleSubmitScan = async () => {
    if (!quantityGrams || !mealType) {
      Alert.alert("Error", "Missing scan details.");
      return;
    }

    setShowMealTypeModal(false);
    setIsLoading(true);
    setError(null);
    setScannedData(null);

    try {
      let response;
      if (scanMode === "image") {
        response = await apiService.scanFoodByImage(
          capturedPhoto.uri,
          mealType,
          parseFloat(quantityGrams),
        );
      } else {
        response = await apiService.scanBarcode(
          capturedBarcode,
          mealType,
          parseFloat(quantityGrams),
        );
      }

      if (response.success && response.data?.scan) {
        const scanData = response.data.scan;
        const foodData = scanData.food;
        const nutritionData = scanData.nutrition;

        const healthAdviceObject =
          scanData.healthSuitability && scanData.healthReason
            ? {
                suitability: scanData.healthSuitability,
                reason: scanData.healthReason,
              }
            : { suitability: "neutral", reason: "Analysis not available." };

        // Helper function to safely display 0 instead of N/A
        const getVal = (val) =>
          val !== undefined && val !== null ? val : "N/A";

        const transformedData = {
          productName: foodData.name || "Unknown Food",
          summary: `${getVal(nutritionData.calories)} calories per ${scanData.quantityGrams || quantityGrams}g serving`,
          imageUrl: scanData.imageUrl
            ? scanData.imageUrl.startsWith("http")
              ? scanData.imageUrl
              : `${process.env.EXPO_PUBLIC_API_URL.replace("/api", "")}${scanData.imageUrl}`
            : null,
          macronutrients: {
            calories: `${getVal(nutritionData.calories)} kcal`,
            protein: `${getVal(nutritionData.protein)}g`,
            carbohydrates: `${getVal(nutritionData.carbs)}g`,
            fat: `${getVal(nutritionData.fats)}g`,
          },
          otherNutrients: [
            `Fiber: ${getVal(nutritionData.fiber)}g`,
            `Sugar: ${getVal(nutritionData.sugar)}g`,
            `Sodium: ${getVal(nutritionData.sodium)}mg`,
            ...(foodData.allergens && foodData.allergens.length > 0
              ? [`Listed Allergens: ${foodData.allergens.join(", ")}`]
              : []),
          ],
          additionalInfo: `Category: ${foodData.category || "N/A"}`,
          healthAdvice: healthAdviceObject,
        };

        setScannedData(transformedData);
      } else {
        setError(response.message || "Analysis failed.");
      }
    } catch (err) {
      setError(err.message || "An error occurred during scanning.");
    } finally {
      setIsLoading(false);
      setCapturedPhoto(null);
      setCapturedBarcode(null);
    }
  };

  const closeNutritionDisplay = () => {
    setScannedData(null);
    setError(null);
    setCapturedBarcode(null);
  };

  if (!permission) return <View />;
  if (!permission.granted)
    return <PermissionsNotice requestPermission={requestPermission} />;

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        ref={cameraRef}
        barcodeScannerSettings={{
          barcodeTypes: ["upc_a", "upc_e", "ean13", "ean8"],
        }}
        onBarcodeScanned={
          scanMode === "barcode" ? handleBarcodeScanned : undefined
        }
      />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.title}>MacroMind</Text>

          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                scanMode === "image" && styles.toggleBtnActive,
              ]}
              onPress={() => setScanMode("image")}
            >
              <Feather
                name="camera"
                size={14}
                color={scanMode === "image" ? "#111827" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.toggleText,
                  scanMode === "image" && styles.toggleTextActive,
                ]}
              >
                AI Vision
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleBtn,
                scanMode === "barcode" && styles.toggleBtnActive,
              ]}
              onPress={() => {
                setScanMode("barcode");
                setIsBarcodeReady(false); // Reset scanner state on switch
              }}
            >
              <Feather
                name="maximize"
                size={14}
                color={scanMode === "barcode" ? "#111827" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.toggleText,
                  scanMode === "barcode" && styles.toggleTextActive,
                ]}
              >
                Barcode
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomContainer}>
          {error && !scannedData && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* AI Vision Button */}
          {!scannedData && scanMode === "image" && (
            <TouchableOpacity
              style={[
                styles.scanButton,
                isLoading && styles.scanButtonDisabled,
              ]}
              onPress={handleCaptureImage}
              disabled={isLoading}
            >
              <Feather
                name="aperture"
                size={20}
                color={isLoading ? "#9CA3AF" : "#111827"}
                style={styles.btnIcon}
              />
              <Text style={styles.scanButtonText}>
                {isLoading ? "PROCESSING..." : "SNAP FOOD"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Manual Barcode Button */}
          {!scannedData && scanMode === "barcode" && (
            <View style={{ alignItems: "center" }}>
              <View style={styles.barcodeTarget}>
                <Feather
                  name="maximize"
                  size={48}
                  color="rgba(255,255,255,0.5)"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.scanButton,
                  (isLoading || isBarcodeReady) && styles.scanButtonDisabled,
                ]}
                onPress={triggerBarcodeScan}
                disabled={isLoading || isBarcodeReady}
              >
                <Feather
                  name="maximize"
                  size={20}
                  color={isLoading || isBarcodeReady ? "#9CA3AF" : "#111827"}
                  style={styles.btnIcon}
                />
                <Text style={styles.scanButtonText}>
                  {isBarcodeReady ? "FOCUSING..." : "SNAP BARCODE"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <Modal
        visible={showMealTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowMealTypeModal(false);
          setCapturedPhoto(null);
          setCapturedBarcode(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Scan Details</Text>

            <Text style={styles.label}>Meal Type</Text>
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

            <Text style={styles.label}>Estimated Quantity (grams)</Text>
            <TextInput
              style={styles.input}
              value={quantityGrams}
              onChangeText={(text) =>
                setQuantityGrams(text.replace(/[^0-9]/g, ""))
              }
              keyboardType="numeric"
              placeholder="e.g., 100"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowMealTypeModal(false);
                  setCapturedPhoto(null);
                  setCapturedBarcode(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !quantityGrams && styles.confirmButtonDisabled,
                ]}
                onPress={handleSubmitScan}
                disabled={!quantityGrams}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {isLoading && <LoadingOverlay />}

      {scannedData && (
        <NutritionDisplay
          data={scannedData}
          onClose={closeNutritionDisplay}
          closeButtonLabel="SCAN ANOTHER"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 20,
  },
  header: { alignItems: "center" },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 24,
    marginTop: 16,
    padding: 4,
    backdropFilter: "blur(10px)",
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 8,
  },
  toggleBtnActive: { backgroundColor: "#FFFFFF" },
  toggleText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  toggleTextActive: { color: "#111827" },
  bottomContainer: { alignItems: "center", paddingBottom: 20 },
  barcodeTarget: {
    marginBottom: 40,
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  scanButtonDisabled: { backgroundColor: "#E5E7EB" },
  btnIcon: { marginRight: 8 },
  scanButtonText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  errorText: {
    color: "#FFFFFF",
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "90%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 24,
    textAlign: "center",
    color: "#111827",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
    color: "#374151",
  },
  mealTypeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  mealTypeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  mealTypeButtonActive: { backgroundColor: "#111827" },
  mealTypeButtonText: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
  mealTypeButtonTextActive: { color: "#FFFFFF", fontWeight: "700" },
  input: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 24,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelButtonText: { fontSize: 15, fontWeight: "700", color: "#4B5563" },
  confirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  confirmButtonDisabled: { backgroundColor: "#9CA3AF" },
  confirmButtonText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
