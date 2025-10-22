// screens/DashboardScreen.js

import React, { useState, useEffect, useCallback } from "react"; // <-- Added useCallback
import {
  View,
  Text,
  StyleSheet, // <-- Ensure StyleSheet is imported
  ScrollView,
  SafeAreaView,
  TouchableOpacity, // Keep if needed, maybe for future buttons
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import apiService from "../services/api";

export default function DashboardScreen({ currentUser }) {
  const [dailySummary, setDailySummary] = useState(null);
  const [loading, setLoading] = useState(true); // Still useful for initial load
  const [refreshing, setRefreshing] = useState(false);
  const [loggingWater, setLoggingWater] = useState(false); // State for water logging action

  // Use useCallback to memoize loadDailySummary
  const loadDailySummary = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) {
      setLoading(true); // Show loading indicator only on initial load/mount
    }
    try {
      const response = await apiService.getDailySummary(); // Fetches today's summary
      if (response.success) {
        setDailySummary(response.data);
      } else {
        console.error("Failed to fetch daily summary:", response.message);
        setDailySummary(null); // Clear data on failure
      }
    } catch (error) {
      console.error("Failed to load daily summary:", error);
      setDailySummary(null); // Clear data on error
      // Optionally show an error message to the user
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // Empty dependency array means it's stable

  // useEffect to load data when the component mounts
  useEffect(() => {
    loadDailySummary();
  }, [loadDailySummary]); // Run when loadDailySummary is defined (on mount)

  // Handler for pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadDailySummary(true); // Pass true to indicate it's a manual refresh
  };

  // --- Render Progress Bar --- (Keep this function as is)
  const renderProgressBar = (current, goal, color) => {
    const safeGoal = goal > 0 ? goal : 1; // Prevent division by zero
    const currentVal = current || 0; // Default to 0 if undefined/null
    const percentage = Math.min(
      Math.max((currentVal / safeGoal) * 100, 0),
      100
    ); // Clamp between 0 and 100
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${percentage}%`, backgroundColor: color },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(currentVal)} / {Math.round(safeGoal)}
        </Text>
      </View>
    );
  };

  const handleLogWater = async (amount) => {
    if (loggingWater) return; // Prevent double taps
    setLoggingWater(true);
    try {
      const response = await apiService.logWaterIntake(amount);
      if (response.success && response.data) {
        // OPTION 1: Optimistic update (faster UI response)
        setDailySummary((prevSummary) => ({
          ...prevSummary,
          totals: {
            ...prevSummary?.totals,
            water: response.data.waterIntakeMl, // Use the total from the response
          },
        }));
        // OPTION 2: Re-fetch the whole summary (ensures consistency if other things changed)
        // await loadDailySummary();
      } else {
        Alert.alert("Error", response.message || "Could not log water.");
      }
    } catch (error) {
      console.error("Log water error:", error);
      Alert.alert("Error", error.message || "Failed to log water intake.");
    } finally {
      setLoggingWater(false);
    }
  };

  // --- Initial Loading State ---
  // Show loading indicator only if data hasn't loaded yet
  if (loading && !dailySummary && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // --- Provide Default Values for Rendering ---
  const totals = dailySummary?.totals || {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    water: 0,
  };
  const goals = dailySummary?.goals || {
    calories: 2000,
    protein: 50,
    carbs: 250,
    fats: 65,
    water: 2000,
  };
  const progress = dailySummary?.progress || {
    caloriePercent: 0,
    proteinPercent: 0,
    carbsPercent: 0,
    fatsPercent: 0,
  };
  const displayDate = dailySummary?.date
    ? new Date(dailySummary.date + "T00:00:00").toLocaleDateString() // Ensure correct date parsing
    : new Date().toLocaleDateString();

  // --- Main Component Render ---
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#007AFF"]}
          />
        }
      >
        <View style={styles.header}>
          {/* Add Welcome Message */}
          <Text style={styles.welcomeMessage}>
            Welcome, {currentUser?.fullName || "User"}! 👋
          </Text>
          <Text style={styles.title}>Daily Summary</Text>
          <Text style={styles.date}>{displayDate}</Text>
        </View>

        {/* Macros Overview */}
        <View style={styles.macrosGrid}>
          {/* Calorie Card */}
          <View style={[styles.macroCard, { backgroundColor: "#e0f2fe" }]}>
            <Text style={styles.macroLabel}>Calories</Text>
            <Text style={styles.macroValue}>{Math.round(totals.calories)}</Text>
            <Text style={styles.macroGoal}>
              Goal: {Math.round(goals.calories)}
            </Text>
            {renderProgressBar(totals.calories, goals.calories, "#0ea5e9")}
          </View>
          {/* Protein Card */}
          <View style={[styles.macroCard, { backgroundColor: "#dcfce7" }]}>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroValue}>{totals.protein.toFixed(1)}g</Text>
            <Text style={styles.macroGoal}>
              Goal: {goals.protein.toFixed(1)}g
            </Text>
            {renderProgressBar(totals.protein, goals.protein, "#22c55e")}
          </View>
          {/* Carbs Card */}
          <View style={[styles.macroCard, { backgroundColor: "#fef3c7" }]}>
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroValue}>{totals.carbs.toFixed(1)}g</Text>
            <Text style={styles.macroGoal}>
              Goal: {goals.carbs.toFixed(1)}g
            </Text>
            {renderProgressBar(totals.carbs, goals.carbs, "#eab308")}
          </View>
          {/* Fats Card */}
          <View style={[styles.macroCard, { backgroundColor: "#fee2e2" }]}>
            <Text style={styles.macroLabel}>Fats</Text>
            <Text style={styles.macroValue}>{totals.fats.toFixed(1)}g</Text>
            <Text style={styles.macroGoal}>Goal: {goals.fats.toFixed(1)}g</Text>
            {renderProgressBar(totals.fats, goals.fats, "#ef4444")}
          </View>
        </View>

        {/* Progress Overview */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Today's Progress (%)</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Calories</Text>
              <Text style={styles.progressPercentage}>
                {progress.caloriePercent}%
              </Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Protein</Text>
              <Text style={styles.progressPercentage}>
                {progress.proteinPercent}%
              </Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Carbs</Text>
              <Text style={styles.progressPercentage}>
                {progress.carbsPercent}%
              </Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Fats</Text>
              <Text style={styles.progressPercentage}>
                {progress.fatsPercent}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Hydration</Text>
          <View style={styles.waterCard}>
            <View style={styles.waterInfo}>
              <Text style={styles.waterLabel}>Today's Intake</Text>
              <Text style={styles.waterValue}>
                {Math.round(totals.water)} ml
              </Text>
              <Text style={styles.waterGoal}>
                Goal: {Math.round(goals.water)} ml
              </Text>
              {/* Water Progress Bar - Reuse existing component */}
              {renderProgressBar(totals.water, goals.water, "#3b82f6")}
              {/* Blue color */}
            </View>
            <View style={styles.waterButtons}>
              <TouchableOpacity
                style={[
                  styles.waterButton,
                  loggingWater && styles.waterButtonDisabled,
                ]}
                onPress={() => handleLogWater(250)}
                disabled={loggingWater}
              >
                <Text style={styles.waterButtonText}>+250ml</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.waterButton,
                  loggingWater && styles.waterButtonDisabled,
                ]}
                onPress={() => handleLogWater(500)}
                disabled={loggingWater}
              >
                <Text style={styles.waterButtonText}>+500ml</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.waterButton,
                  loggingWater && styles.waterButtonDisabled,
                ]}
                onPress={() => handleLogWater(750)} // Example: Add 750ml option
                disabled={loggingWater}
              >
                <Text style={styles.waterButtonText}>+750ml</Text>
              </TouchableOpacity>
              {/* Add more buttons as needed */}
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Additional Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Fiber</Text>
              <Text style={styles.statValue}>{totals.fiber.toFixed(1)}g</Text>
              {/* Optional: Add fiber goal display */}
            </View>
            {/* Removed Water from here */}
            {/* <View style={styles.statItem}> ... </View> */}
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              {progress.caloriePercent < 50
                ? "💡 Keep fueling your day! You've got room for more nutritious choices."
                : progress.caloriePercent > 100
                ? "⚠️ You've exceeded your calorie goal. Focus on mindful eating for the rest of the day."
                : progress.caloriePercent > 90
                ? "👍 You're close to your calorie goal. Great job staying mindful!"
                : "✅ Looking good! You're on track with your calorie intake today."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles --- (Keep existing styles, ensure StyleSheet is imported)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f4f8",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 10, // Add some padding below the header content
    borderBottomWidth: 1, // Optional: Add a separator line
    borderBottomColor: "#e5e7eb", // Optional: Separator color
  },
  welcomeMessage: {
    fontSize: 20, // Adjust size as needed
    fontWeight: "600", // Semi-bold
    color: "#374151", // Darker gray
    marginBottom: 12, // Space below welcome message
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
  },
  date: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 4,
  },
  macrosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  macroCard: {
    width: "48%",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1.5,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 6,
  },
  macroValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  macroGoal: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 6,
  },
  progressBarContainer: {
    marginTop: 6,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "right",
  },
  progressSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  progressCard: {
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1.5,
  },
  progressItem: {
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  waterCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1.5,
  },
  waterInfo: {
    marginBottom: 15,
  },
  waterLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  waterValue: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  waterGoal: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 10,
  },
  waterButtons: {
    flexDirection: "row",
    justifyContent: "space-around", // Distribute buttons evenly
    marginTop: 10,
  },
  waterButton: {
    backgroundColor: "#e0f2fe", // Light blue background
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20, // Rounded pill shape
    borderWidth: 1,
    borderColor: "#7dd3fc", // Lighter blue border
  },
  waterButtonDisabled: {
    backgroundColor: "#e5e7eb", // Gray out when disabled
    borderColor: "#d1d5db",
  },
  waterButtonText: {
    color: "#0c546b", // Dark blue text
    fontWeight: "600",
    fontSize: 14,
  },

  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1.5,
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
  },
  tipsSection: {
    marginBottom: 24,
  },
  tipCard: {
    backgroundColor: "#e0f2fe",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
  },
  tipText: {
    fontSize: 14,
    color: "#0c546b",
    lineHeight: 20,
  },
});
