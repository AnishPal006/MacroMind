import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import apiService from "../services/api";
import NutritionDisplay from "../components/NutritionDisplay";

export default function HistoryScreen() {
  const [scans, setScans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);

  const fetchHistory = async () => {
    try {
      const response = await apiService.getFoodScans();
      if (response.success) setScans(response.data || []);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const handleDelete = (scanId) => {
    Alert.alert(
      "Delete Meal",
      "Are you sure you want to remove this meal from your history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await apiService.removeFoodScan(scanId);
              if (res.success)
                setScans(scans.filter((scan) => scan.id !== scanId));
            } catch (error) {
              Alert.alert("Error", "Failed to delete the meal.");
            }
          },
        },
      ],
    );
  };

  const openScanDetails = (scan) => {
    const multiplier = (scan.quantityGrams || 100) / 100;
    setSelectedScan({
      productName: scan.food?.name || "Unknown Food",
      summary: `${Math.round((scan.food?.caloriesPer100g || 0) * multiplier)} kcal per ${scan.quantityGrams}g`,
      macronutrients: {
        calories: `${Math.round((scan.food?.caloriesPer100g || 0) * multiplier)} kcal`,
        protein: `${((scan.food?.proteinGrams || 0) * multiplier).toFixed(1)}g`,
        carbohydrates: `${((scan.food?.carbsGrams || 0) * multiplier).toFixed(1)}g`,
        fat: `${((scan.food?.fatsGrams || 0) * multiplier).toFixed(1)}g`,
      },
      otherNutrients: [
        `Fiber: ${((scan.food?.fiberGrams || 0) * multiplier).toFixed(1)}g`,
        `Sugar: ${((scan.food?.sugarGrams || 0) * multiplier).toFixed(1)}g`,
      ],
      healthAdvice: {
        suitability: scan.healthSuitability || "neutral",
        reason: scan.healthReason || "No health insights available.",
      },
    });
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

  // THE NEW DARK HERO HEADER FOR THE LIST
  const ListHeader = () => (
    <View style={styles.heroCard}>
      <View style={styles.heroTextContainer}>
        <Text style={styles.heroTitle}>Meal History</Text>
        <Text style={styles.heroSub}>Review your nutrition journey</Text>
      </View>
      <View style={styles.heroIconCircle}>
        <Feather name="clock" size={24} color="#111827" />
      </View>
    </View>
  );

  const renderScanItem = ({ item }) => {
    const calories = Math.round(
      (item.food?.caloriesPer100g || 0) * (item.quantityGrams / 100),
    );
    const dateObj = new Date(item.scannedAt || item.createdAt);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => openScanDetails(item)}
      >
        <View style={styles.iconCircle}>
          <Feather
            name={getMealIcon(item.mealType)}
            size={22}
            color="#111827"
          />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.foodName} numberOfLines={1}>
            {item.food?.name || "Unknown Food"}
          </Text>
          <Text style={styles.foodDetails}>
            {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)} •{" "}
            {item.quantityGrams}g
          </Text>
          <Text style={styles.timeText}>
            {dateObj.toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
            at{" "}
            {dateObj.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.calorieText}>
            {calories} <Text style={styles.kcalText}>kcal</Text>
          </Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id)}
          >
            <Feather name="trash-2" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderScanItem}
          ListHeaderComponent={ListHeader} // INJECTING THE HERO CARD HERE
          ListEmptyComponent={
            <View style={styles.centerContent}>
              <View style={styles.emptyCircle}>
                <Feather name="clock" size={40} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No History Yet</Text>
              <Text style={styles.emptyText}>
                Scan some meals to see them here.
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#111827"
            />
          }
        />
      )}

      {selectedScan && (
        <NutritionDisplay
          data={selectedScan}
          onClose={() => setSelectedScan(null)}
          closeButtonLabel="DONE"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAF9" },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingBottom: 130,
  },

  // NEW DARK HERO HEADER
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111827",
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#D4EB9B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  heroTextContainer: { flex: 1 },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  heroSub: { fontSize: 14, color: "#9CA3AF", fontWeight: "600" },
  heroIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#D4EB9B",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#D4EB9B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: { flex: 1, justifyContent: "center" },
  foodName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  foodDetails: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
    marginBottom: 2,
  },
  timeText: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  cardRight: { alignItems: "flex-end", justifyContent: "center" },
  calorieText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  kcalText: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
  deleteBtn: { padding: 4 },

  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
    marginTop: 40,
  },
  emptyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyText: { fontSize: 15, color: "#6B7280" },
});
