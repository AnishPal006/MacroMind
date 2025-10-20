import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import apiService from "../services/api";

export default function DashboardScreen() {
  const [dailySummary, setDailySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDailySummary();
  }, []);

  const loadDailySummary = async () => {
    try {
      const response = await apiService.getDailySummary();
      if (response.success) {
        setDailySummary(response.data);
      }
    } catch (error) {
      console.error("Failed to load daily summary:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDailySummary();
  };

  const renderProgressBar = (current, goal, color) => {
    const percentage = Math.min((current / goal) * 100, 100);
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
          {current} / {goal}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Daily Summary</Text>
          <Text style={styles.date}>
            {dailySummary?.date || new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Macros Overview */}
        <View style={styles.macrosGrid}>
          <View style={[styles.macroCard, { backgroundColor: "#e0f2fe" }]}>
            <Text style={styles.macroLabel}>Calories</Text>
            <Text style={styles.macroValue}>
              {dailySummary?.totals?.calories || 0}
            </Text>
            <Text style={styles.macroGoal}>
              Goal: {dailySummary?.goals?.calories || 2000}
            </Text>
            {renderProgressBar(
              dailySummary?.totals?.calories || 0,
              dailySummary?.goals?.calories || 2000,
              "#0ea5e9"
            )}
          </View>

          <View style={[styles.macroCard, { backgroundColor: "#dcfce7" }]}>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroValue}>
              {dailySummary?.totals?.protein || 0}g
            </Text>
            <Text style={styles.macroGoal}>
              Goal: {dailySummary?.goals?.protein || 50}g
            </Text>
            {renderProgressBar(
              dailySummary?.totals?.protein || 0,
              dailySummary?.goals?.protein || 50,
              "#22c55e"
            )}
          </View>

          <View style={[styles.macroCard, { backgroundColor: "#fef3c7" }]}>
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroValue}>
              {dailySummary?.totals?.carbs || 0}g
            </Text>
            <Text style={styles.macroGoal}>
              Goal: {dailySummary?.goals?.carbs || 250}g
            </Text>
            {renderProgressBar(
              dailySummary?.totals?.carbs || 0,
              dailySummary?.goals?.carbs || 250,
              "#eab308"
            )}
          </View>

          <View style={[styles.macroCard, { backgroundColor: "#fee2e2" }]}>
            <Text style={styles.macroLabel}>Fats</Text>
            <Text style={styles.macroValue}>
              {dailySummary?.totals?.fats || 0}g
            </Text>
            <Text style={styles.macroGoal}>
              Goal: {dailySummary?.goals?.fats || 65}g
            </Text>
            {renderProgressBar(
              dailySummary?.totals?.fats || 0,
              dailySummary?.goals?.fats || 65,
              "#ef4444"
            )}
          </View>
        </View>

        {/* Progress Overview */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Calories</Text>
              <Text style={styles.progressPercentage}>
                {dailySummary?.progress?.caloriePercent || 0}%
              </Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Protein</Text>
              <Text style={styles.progressPercentage}>
                {dailySummary?.progress?.proteinPercent || 0}%
              </Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Carbs</Text>
              <Text style={styles.progressPercentage}>
                {dailySummary?.progress?.carbsPercent || 0}%
              </Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Fats</Text>
              <Text style={styles.progressPercentage}>
                {dailySummary?.progress?.fatsPercent || 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Additional Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Fiber</Text>
              <Text style={styles.statValue}>
                {dailySummary?.totals?.fiber || 0}g
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Water</Text>
              <Text style={styles.statValue}>
                {dailySummary?.totals?.water || 0}ml
              </Text>
            </View>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              {dailySummary?.progress?.caloriePercent < 50
                ? "💡 You still have plenty of calories left today. Consider adding a healthy snack!"
                : dailySummary?.progress?.caloriePercent > 90
                ? "⚠️ You're close to your calorie goal. Stay mindful of your intake."
                : "✅ You're on track with your calorie goals!"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
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
    marginBottom: 24,
  },
  macroCard: {
    width: "48%",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  macroGoal: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
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
  },
  progressSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  progressCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
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
    borderRadius: 16,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  tipsSection: {
    marginBottom: 24,
  },
  tipCard: {
    backgroundColor: "#dbeafe",
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  tipText: {
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 20,
  },
});
