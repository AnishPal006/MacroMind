import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SectionList,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons"; // <-- Added Vector Icons
import apiService from "../services/api";
import NutritionDisplay from "../components/NutritionDisplay";

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);

  const loadHistory = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) {
      setLoading(true);
    }
    try {
      const response = await apiService.getFoodScans();
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
  }, []);

  const transformHistoryData = (scans) => {
    if (!scans || scans.length === 0) return [];

    const grouped = {};
    scans.forEach((scan) => {
      if (!scan.scanDate || isNaN(new Date(scan.scanDate).getTime())) return;

      const dateObj = new Date(scan.scanDate + "T00:00:00");
      const dateStr = dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(scan);
    });

    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
      .map(([title, data]) => ({
        title,
        data: data.sort(
          (a, b) => new Date(b.scannedAt) - new Date(a.scannedAt),
        ),
      }));
  };

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory(true);
  };

  const formatScanForDisplay = (scan) => {
    if (!scan || !scan.food) return { productName: null };

    const multiplier = scan.quantityGrams / 100;
    const nutrition = {
      calories: Math.round((scan.food.caloriesPer100g || 0) * multiplier),
      protein: parseFloat(
        ((scan.food.proteinGrams || 0) * multiplier).toFixed(1),
      ),
      carbs: parseFloat(((scan.food.carbsGrams || 0) * multiplier).toFixed(1)),
      fats: parseFloat(((scan.food.fatsGrams || 0) * multiplier).toFixed(1)),
      fiber: parseFloat(((scan.food.fiberGrams || 0) * multiplier).toFixed(1)),
      sugar: parseFloat(((scan.food.sugarGrams || 0) * multiplier).toFixed(1)),
      sodium: parseFloat(((scan.food.sodiumMg || 0) * multiplier).toFixed(1)),
    };

    const imageUrl = scan.imageUrl
      ? `${process.env.EXPO_PUBLIC_API_URL.replace("/api", "")}${scan.imageUrl}`
      : null;

    return {
      productName: scan.food.name,
      summary: `${nutrition.calories} calories per ${scan.quantityGrams}g serving`,
      imageUrl: imageUrl,
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
        ...(scan.food.allergens && scan.food.allergens.length > 0
          ? [`Allergens: ${scan.food.allergens.join(", ")}`]
          : []),
      ],
      additionalInfo: scan.allergenWarning
        ? `⚠️ Allergen Warning: Contains potential allergens relevant to you.`
        : `Category: ${scan.food.category || "N/A"}`,
      healthAdvice:
        scan.healthSuitability && scan.healthReason
          ? { suitability: scan.healthSuitability, reason: scan.healthReason }
          : {
              suitability: "neutral",
              reason: "Health advice not recorded for this scan.",
            },
    };
  };

  const handleItemPress = async (item) => {
    if (!item || !item.foodId) return;
    const basicFormattedData = formatScanForDisplay(item);
    setSelectedScan(basicFormattedData);
  };

  const handleDeleteItem = (scanId) => {
    if (!scanId) return;

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
              setLoading(true);
              const response = await apiService.removeFoodScan(scanId);
              if (response.success) {
                loadHistory();
              } else {
                throw new Error(response.message || "Failed to delete scan.");
              }
            } catch (error) {
              console.error("Delete scan error:", error);
              Alert.alert(
                "Error",
                error.message || "Could not delete the scan.",
              );
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const getMealIcon = (mealType) => {
    switch (mealType?.toLowerCase()) {
      case "breakfast":
        return "sunrise";
      case "lunch":
        return "sun";
      case "dinner":
        return "moon";
      default:
        return "coffee";
    }
  };

  const renderHistoryItem = ({ item }) => {
    const multiplier = item.quantityGrams / 100;
    const calories = Math.round((item.food?.caloriesPer100g || 0) * multiplier);
    const scanTime = item.scannedAt
      ? new Date(item.scannedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";

    return (
      <TouchableOpacity
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.historyItem}>
          <View style={styles.iconContainer}>
            <Feather
              name={getMealIcon(item.mealType)}
              size={20}
              color="#6B7280"
            />
          </View>

          <View style={styles.itemHeaderText}>
            <Text style={styles.foodName} numberOfLines={1}>
              {item.food?.name || "Unknown Food"}
            </Text>
            <Text style={styles.mealType}>
              {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)} •{" "}
              {item.quantityGrams}g • {scanTime}
            </Text>
          </View>

          <View style={styles.itemRightSide}>
            <Text style={styles.calorieText}>
              {calories} <Text style={styles.kcalText}>kcal</Text>
            </Text>
            <TouchableOpacity
              onPress={() => handleDeleteItem(item.id)}
              style={styles.deleteButtonContainer}
            >
              <Feather name="trash-2" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : history.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyStateContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#111827"
            />
          }
        >
          <View style={styles.emptyStateContent}>
            <Feather
              name="clock"
              size={48}
              color="#D1D5DB"
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.emptyStateTitle}>No Scans Yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Start scanning food items to see your timeline. Pull down to
              refresh.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <SectionList
          sections={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderHistoryItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#111827"
            />
          }
          stickySectionHeadersEnabled={false}
        />
      )}

      {selectedScan && (
        <NutritionDisplay
          data={selectedScan}
          onClose={() => setSelectedScan(null)}
          closeButtonLabel="CLOSE"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#F9FAFB",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  itemHeaderText: {
    flex: 1,
    justifyContent: "center",
  },
  foodName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  mealType: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  itemRightSide: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  calorieText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  kcalText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  deleteButtonContainer: {
    padding: 4,
  },
  emptyStateContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
