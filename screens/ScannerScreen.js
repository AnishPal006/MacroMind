import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import apiService from "../services/api";
import PermissionsNotice from "../components/PermissionsNotice";
import LoadingOverlay from "../components/LoadingOverlay";
import NutritionDisplay from "../components/NutritionDisplay";

// <-- Added onNavigate prop here
export default function ScannerScreen({ onNavigate }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState("image");
  const [scannedData, setScannedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);
  const [mealType, setMealType] = useState("lunch");
  const [quantityGrams, setQuantityGrams] = useState("100");
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [capturedBarcode, setCapturedBarcode] = useState(null);
  const [isBarcodeReady, setIsBarcodeReady] = useState(false);
  const cameraRef = useRef(null);

  const handleCaptureTrigger = async () => {
    if (scanMode === "image") {
      if (!cameraRef.current) return;
      setError(null);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });
        setCapturedPhoto(photo);
        setShowMealTypeModal(true);
      } catch (err) {
        Alert.alert("Error", "Failed to capture photo.");
      }
    } else {
      setIsBarcodeReady(true);
      setError(null);
      setTimeout(() => setIsBarcodeReady(false), 3000);
    }
  };

  const handleBarcodeScanned = ({ data }) => {
    if (
      scanMode !== "barcode" ||
      !isBarcodeReady ||
      showMealTypeModal ||
      isLoading ||
      scannedData
    )
      return;
    setIsBarcodeReady(false);
    setError(null);
    setCapturedBarcode(data);
    setShowMealTypeModal(true);
  };

  const handleSubmitScan = async () => {
    setShowMealTypeModal(false);
    setIsLoading(true);
    setError(null);
    setScannedData(null);
    try {
      let response =
        scanMode === "image"
          ? await apiService.scanFoodByImage(
              capturedPhoto.uri,
              mealType,
              parseFloat(quantityGrams),
            )
          : await apiService.scanBarcode(
              capturedBarcode,
              mealType,
              parseFloat(quantityGrams),
            );

      if (response.success && response.data?.scan) {
        const { food, nutrition, healthSuitability, healthReason } =
          response.data.scan;
        const getVal = (val) =>
          val !== undefined && val !== null ? val : "N/A";

        setScannedData({
          productName: food.name || "Unknown Food",
          summary: `${getVal(nutrition.calories)} kcal per ${quantityGrams}g`,
          imageUrl: response.data.scan.imageUrl || null,
          macronutrients: {
            calories: `${getVal(nutrition.calories)} kcal`,
            protein: `${getVal(nutrition.protein)}g`,
            carbohydrates: `${getVal(nutrition.carbs)}g`,
            fat: `${getVal(nutrition.fats)}g`,
          },
          otherNutrients: [
            `Fiber: ${getVal(nutrition.fiber)}g`,
            `Sugar: ${getVal(nutrition.sugar)}g`,
          ],
          healthAdvice: {
            suitability: healthSuitability || "neutral",
            reason: healthReason || "",
          },
        });
      } else setError(response.message || "Analysis failed.");
    } catch (err) {
      setError(err.message || "Error occurred.");
    } finally {
      setIsLoading(false);
      setCapturedPhoto(null);
      setCapturedBarcode(null);
    }
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
        {/* Top Header */}
        <View style={styles.header}>
          {/* <-- Wired up the Back button right here! */}
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => onNavigate("dashboard")}
          >
            <Feather name="arrow-left" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Scanner</Text>
          <TouchableOpacity style={styles.iconCircle}>
            <Feather name="more-vertical" size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Floating Toggle Menu */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              scanMode === "image" && styles.toggleBtnActive,
            ]}
            onPress={() => setScanMode("image")}
          >
            <Feather
              name="aperture"
              size={20}
              color={scanMode === "image" ? "#111827" : "#FFFFFF"}
            />
            <Text
              style={[
                styles.toggleText,
                scanMode === "image" && styles.toggleTextActive,
              ]}
            >
              Scan Food
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              scanMode === "barcode" && styles.toggleBtnActive,
            ]}
            onPress={() => {
              setScanMode("barcode");
              setIsBarcodeReady(false);
            }}
          >
            <Feather
              name="maximize"
              size={20}
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

        {/* Center Viewfinder */}
        <View style={styles.viewfinderContainer}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          {scanMode === "barcode" && isBarcodeReady && (
            <View style={styles.scanLine} />
          )}
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {error && !scannedData && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.sideBtn}>
              <Feather name="image" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.shutterBtnOuter,
                (isLoading || (scanMode === "barcode" && isBarcodeReady)) &&
                  styles.shutterBtnDisabled,
              ]}
              onPress={handleCaptureTrigger}
              disabled={isLoading || (scanMode === "barcode" && isBarcodeReady)}
            >
              <View style={styles.shutterBtnInner} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sideBtn}>
              <Feather name="zap-off" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={showMealTypeModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Details</Text>
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
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={quantityGrams}
              onChangeText={setQuantityGrams}
              keyboardType="numeric"
              placeholder="Weight (g)"
            />
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleSubmitScan}
            >
              <Text style={styles.confirmButtonText}>Analyze Food</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {isLoading && <LoadingOverlay />}
      {scannedData && (
        <NutritionDisplay
          data={scannedData}
          onClose={() => setScannedData(null)}
          closeButtonLabel="DONE"
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
    paddingTop: 50,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 4,
  },

  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 20,
  },
  toggleBtn: {
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    width: 90,
  },
  toggleBtnActive: { backgroundColor: "#D4EB9B" },
  toggleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  toggleTextActive: { color: "#111827" },

  viewfinderContainer: {
    alignSelf: "center",
    width: 280,
    height: 280,
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#FFFFFF",
    borderWidth: 4,
  },
  tl: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
  },
  tr: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 20,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 20,
  },
  br: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 20,
  },
  scanLine: {
    width: "100%",
    height: 2,
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },

  bottomControls: { paddingHorizontal: 40 },
  errorText: {
    color: "#FFF",
    backgroundColor: "#EF4444",
    padding: 10,
    borderRadius: 10,
    textAlign: "center",
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sideBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterBtnOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
  },
  shutterBtnDisabled: { opacity: 0.5 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
  },
  mealTypeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  mealTypeButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    flex: 1,
    alignItems: "center",
  },
  mealTypeButtonActive: { backgroundColor: "#111827" },
  mealTypeButtonText: {
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "capitalize",
  },
  mealTypeButtonTextActive: { color: "#FFF" },
  input: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: "#D4EB9B",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  confirmButtonText: { color: "#111827", fontSize: 16, fontWeight: "800" },
});
