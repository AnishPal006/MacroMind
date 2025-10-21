// screens/HistoryScreen.js

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet, // <-- Ensure StyleSheet is imported
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SectionList,
  RefreshControl,
  Image,
  ScrollView, // <-- Import Image if you want to show food images later
} from "react-native";
import apiService from "../services/api";
import NutritionDisplay from "../components/NutritionDisplay"; // <-- Import NutritionDisplay

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null); // Holds formatted data for display

  // Fetch history data
  const loadHistory = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) {
      setLoading(true);
    }
    try {
      // Fetch individual scans
      const response = await apiService.getFoodScans(); // Fetches last 30 days by default (as per backend/src/routes/logs.js)
      if (response.success && Array.isArray(response.data)) {
        const groupedData = transformHistoryData(response.data);
        setHistory(groupedData);
      } else {
        console.error("API did not return successful scan data:", response);
        setHistory([]);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
      Alert.alert("Error", "Failed to load food history");
      setHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // Empty dependency array, created once

  // Load history when the component mounts
  // useEffect(() => {
  //   loadHistory();
  // }, [loadHistory]); // Run once on mount

  // Transform scan data into sections grouped by date
  const transformHistoryData = (scans) => {
    if (!scans || scans.length === 0) {
      return [];
    }
    const grouped = {};
    scans.forEach((scan) => {
      // Ensure scanDate exists and is valid before processing
      if (!scan.scanDate || isNaN(new Date(scan.scanDate).getTime())) {
        console.warn("Invalid or missing scanDate for scan:", scan.id);
        return; // Skip this scan
      }
      const dateObj = new Date(scan.scanDate + "T00:00:00"); // Ensure it's treated as local date
      const dateStr = dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric", // Add year for clarity
      });

      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(scan); // Add the whole scan object
    });

    // Convert to section list format and sort sections by date descending
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA)) // Sort sections by date
      .map(([title, data]) => ({
        title,
        // Sort items within each section by scanned time descending
        data: data.sort(
          (a, b) => new Date(b.scannedAt) - new Date(a.scannedAt)
        ),
      }));
  };

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Handler for pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadHistory(true); // Pass true to indicate refresh
  };

  // Function to format scan data for NutritionDisplay
  const formatScanForDisplay = (scan) => {
    if (!scan || !scan.food) {
      console.warn("Attempted to format invalid scan:", scan);
      return { productName: null }; // Error structure for NutritionDisplay
    }

    const multiplier = scan.quantityGrams / 100;
    const nutrition = {
      calories: Math.round((scan.food.caloriesPer100g || 0) * multiplier),
      protein: parseFloat(
        ((scan.food.proteinGrams || 0) * multiplier).toFixed(1)
      ),
      carbs: parseFloat(((scan.food.carbsGrams || 0) * multiplier).toFixed(1)),
      fats: parseFloat(((scan.food.fatsGrams || 0) * multiplier).toFixed(1)),
      fiber: parseFloat(((scan.food.fiberGrams || 0) * multiplier).toFixed(1)),
      sugar: parseFloat(((scan.food.sugarGrams || 0) * multiplier).toFixed(1)),
      sodium: parseFloat(((scan.food.sodiumMg || 0) * multiplier).toFixed(1)),
    };

    // Construct full image URL if applicable and storing locally
    const imageUrl = scan.imageUrl
      ? `${process.env.EXPO_PUBLIC_API_URL.replace("/api", "")}${scan.imageUrl}`
      : null;

    return {
      productName: scan.food.name,
      summary: `${nutrition.calories} calories per ${scan.quantityGrams}g serving`,
      imageUrl: imageUrl, // Include image URL if you want NutritionDisplay to show it
      macronutrients: {
        calories: `${nutrition.calories} kcal`,
        protein: `${nutrition.protein}g`,
        carbohydrates: `${nutrition.carbs}g`,
        fat: `${nutrition.fats}g`,
      },
      otherNutrients: [
        `Fiber: ${nutrition.fiber}g`,
        `Sugar: ${nutrition.sugar}g`,
        `Sodium: ${nutrition.sodium}mg`,
        // Conditionally add allergens if they exist
        ...(scan.food.allergens && scan.food.allergens.length > 0
          ? [`Allergens: ${scan.food.allergens.join(", ")}`]
          : []),
      ],
      // Use scan's specific allergen warning status
      additionalInfo: scan.allergenWarning
        ? `⚠️ Allergen Warning: Contains potential allergens relevant to you.`
        : `Category: ${scan.food.category || "N/A"}`,
      healthAdvice:
        scan.healthSuitability && scan.healthReason
          ? { suitability: scan.healthSuitability, reason: scan.healthReason }
          : {
              suitability: "neutral",
              reason: "Health advice not recorded for this scan.",
            }, // Default if missing
    };
  };

  // Handle item press to show details
  const handleItemPress = async (item) => {
    if (!item || !item.foodId) return;

    // 1. Show basic details immediately
    const basicFormattedData = formatScanForDisplay(item);
    setSelectedScan(basicFormattedData); // Show nutrition info without advice yet
  };

  // Handle deleting an item
  const handleDeleteItem = (scanId) => {
    if (!scanId) {
      console.error("Delete failed: Invalid scanId provided.");
      return;
    }
    Alert.alert(
      "Delete Scan",
      "Are you sure you want to delete this scan entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true); // Show loading indicator during deletion
              const response = await apiService.removeFoodScan(scanId);
              if (response.success) {
                // Reload history after successful deletion
                loadHistory();
              } else {
                throw new Error(response.message || "Failed to delete scan.");
              }
            } catch (error) {
              console.error("Delete scan error:", error);
              Alert.alert(
                "Error",
                error.message || "Could not delete the scan."
              );
              setLoading(false); // Hide loading on error
            }
          },
        },
      ]
    );
  };

  // Render each history item in the list
  const renderHistoryItem = ({ item }) => {
    // Basic calculation for display in the list item itself
    const multiplier = item.quantityGrams / 100;
    const calories = Math.round((item.food?.caloriesPer100g || 0) * multiplier);
    const scanTime = item.scannedAt
      ? new Date(item.scannedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";

    return (
      <TouchableOpacity onPress={() => handleItemPress(item)}>
        <View style={styles.historyItem}>
          <View style={styles.itemHeader}>
            <View style={styles.itemHeaderText}>
              <Text
                style={styles.foodName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.food?.name || "Unknown Food"}
              </Text>
              <Text style={styles.mealType}>
                {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)}{" "}
                - {item.quantityGrams}g ({calories} kcal)
              </Text>
              <Text style={styles.scanTimeText}>{scanTime}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteItem(item.id)}
              style={styles.deleteButtonContainer}
            >
              <Text style={styles.deleteButton}>✕</Text>
            </TouchableOpacity>
          </View>
          {/* Optional: Add image thumbnail here if needed */}
          {/* {item.imageUrl && <Image source={{ uri: `${process.env.EXPO_PUBLIC_API_URL.replace('/api', '')}${item.imageUrl}` }} style={styles.foodImageThumbnail} />} */}
        </View>
      </TouchableOpacity>
    );
  };

  // Render the header for each date section
  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  // Main component render
  return (
    <SafeAreaView style={styles.container}>
      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Scan History</Text>
        <Text style={styles.subtitle}>Your recent food scans</Text>
      </View>

      {/* Conditional Rendering: Loading, Empty State, or List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : history.length === 0 ? (
        // Use ScrollView for empty state to allow pull-to-refresh
        <ScrollView
          contentContainerStyle={styles.emptyStateContainer} // Use a different style for centering
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#007AFF"]}
            />
          }
        >
          <View style={styles.emptyStateContent}>
            <Text style={styles.emptyStateText}>📊</Text>
            <Text style={styles.emptyStateTitle}>No Scans Yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Start scanning food items to see your history here. Pull down to
              refresh.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <SectionList
          sections={history}
          keyExtractor={(item) => item.id.toString()} // Ensure key is a string
          renderItem={renderHistoryItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#007AFF"]}
            />
          }
          stickySectionHeadersEnabled={false} // Keep headers static on scroll
        />
      )}

      {/* Nutrition Display Overlay */}
      {selectedScan && (
        <NutritionDisplay
          data={selectedScan}
          onClose={() => setSelectedScan(null)}
          closeButtonLabel="CLOSE" // <--- This tells it to display "CLOSE"
        />
      )}
    </SafeAreaView>
  );
}

// Styles (Make sure StyleSheet is imported from react-native)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8", // Light background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f4f8",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20, // Adjust top padding if needed based on SafeAreaView
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "white", // White header background
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937", // Darker text
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280", // Gray text
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8, // Add some top padding to the list
    paddingBottom: 20,
  },
  sectionHeader: {
    marginTop: 16, // Space above date headers
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4b5563", // Medium gray text
  },
  historyItem: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1.5,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // Align top
  },
  itemHeaderText: {
    flex: 1, // Allow text to take space and wrap if needed
    marginRight: 10,
  },
  foodName: {
    fontSize: 15, // Slightly smaller food name
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  mealType: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  scanTimeText: {
    fontSize: 12,
    color: "#9ca3af", // Lighter gray for time
  },
  deleteButtonContainer: {
    paddingLeft: 10, // Easier to tap
    paddingTop: 2,
  },
  deleteButton: {
    fontSize: 18,
    color: "#ef4444", // Red color for delete
    fontWeight: "bold",
  },
  emptyStateContainer: {
    // Style for the ScrollView containing empty state
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateContent: {
    // Style for the content inside the empty state ScrollView
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateText: {
    // Emoji style
    fontSize: 54,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  // Optional: Add styles for image thumbnail if you include it
  // foodImageThumbnail: {
  //   width: 50,
  //   height: 50,
  //   borderRadius: 8,
  //   marginTop: 8,
  // },
});
