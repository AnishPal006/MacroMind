import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import apiService from "../services/api";

export default function DashboardScreen({ currentUser, onNavigate }) {
  const [dailyLog, setDailyLog] = useState(null);
  const [latestMeal, setLatestMeal] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDailySummary = async () => {
    try {
      const response = await apiService.getDailySummary();
      if (response.success) {
        setDailyLog(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch daily summary:", error);
    }
  };

  const fetchLatestMeal = async () => {
    try {
      const response = await apiService.getFoodScans();
      if (
        response.success &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        // Sort by time descending to ensure we get the absolute latest scan
        const sortedScans = response.data.sort(
          (a, b) => new Date(b.scannedAt) - new Date(a.scannedAt),
        );
        setLatestMeal(sortedScans[0]);
      } else {
        setLatestMeal(null);
      }
    } catch (error) {
      console.error("Failed to fetch latest meal:", error);
    }
  };

  useEffect(() => {
    fetchDailySummary();
    fetchLatestMeal();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDailySummary(), fetchLatestMeal()]);
    setRefreshing(false);
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#111827"
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>{today}</Text>
          <Text style={styles.greeting}>
            Hello, {currentUser?.fullName?.split(" ")[0] || "User"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => onNavigate("profile")} // <-- Wires up the profile button
        >
          <Feather name="user" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Main Macro Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Today's Summary</Text>

        <View style={styles.mainCalorieContainer}>
          <Feather name="zap" size={32} color="#F59E0B" />
          <View style={styles.calorieTextContainer}>
            <Text style={styles.calorieValue}>
              {dailyLog?.totals?.calories
                ? Math.round(dailyLog.totals.calories)
                : 0}
            </Text>
            <Text style={styles.calorieLabel}>kcal consumed</Text>
          </View>
        </View>

        <View style={styles.macrosContainer}>
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>
              {dailyLog?.totals?.protein
                ? Math.round(dailyLog.totals.protein)
                : 0}
              g
            </Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>
              {dailyLog?.totals?.carbs ? Math.round(dailyLog.totals.carbs) : 0}g
            </Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroBox}>
            <Text style={styles.macroValue}>
              {dailyLog?.totals?.fats ? Math.round(dailyLog.totals.fats) : 0}g
            </Text>
            <Text style={styles.macroLabel}>Fats</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Meal</Text>
        <TouchableOpacity onPress={() => onNavigate("history")}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      {latestMeal ? (
        <TouchableOpacity
          style={styles.recentMealCard}
          activeOpacity={0.7}
          onPress={() => onNavigate("history")} // Tapping the meal also goes to history
        >
          <View style={styles.iconContainer}>
            <Feather
              name={getMealIcon(latestMeal.mealType)}
              size={20}
              color="#6B7280"
            />
          </View>

          <View style={styles.itemHeaderText}>
            <Text style={styles.foodName} numberOfLines={1}>
              {latestMeal.food?.name || "Unknown Food"}
            </Text>
            <Text style={styles.mealType}>
              {latestMeal.mealType.charAt(0).toUpperCase() +
                latestMeal.mealType.slice(1)}{" "}
              • {latestMeal.quantityGrams}g
            </Text>
          </View>

          <View style={styles.itemRightSide}>
            <Text style={styles.calorieText}>
              {Math.round(
                (latestMeal.food?.caloriesPer100g || 0) *
                  (latestMeal.quantityGrams / 100),
              )}{" "}
              <Text style={styles.kcalText}>kcal</Text>
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyStateCard}>
          <Feather name="coffee" size={32} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>No meals logged yet today.</Text>
          <Text style={styles.emptyStateSubtext}>
            Scan your food to get started.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  contentContainer: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  dateText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },
  mainCalorieContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 16,
  },
  calorieTextContainer: {
    flex: 1,
  },
  calorieValue: {
    fontSize: 40,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 44,
  },
  calorieLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  macrosContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-between",
    alignItems: "center",
  },
  macroBox: {
    flex: 1,
    alignItems: "center",
  },
  macroValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  macroLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "600",
  },
  macroDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  emptyStateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderStyle: "dashed",
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
  recentMealCard: {
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
    width: 44,
    height: 44,
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
  },
  kcalText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
