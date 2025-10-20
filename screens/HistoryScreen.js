import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SectionList,
  RefreshControl,
} from "react-native";
import apiService from "../services/api";

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterDate, setFilterDate] = useState("all");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await apiService.getWeeklySummary();
      if (response.success) {
        // Transform the response into grouped by date format
        const groupedData = transformHistoryData(response.data);
        setHistory(groupedData);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
      Alert.alert("Error", "Failed to load food history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const transformHistoryData = (weeklyData) => {
    if (!weeklyData || !weeklyData.dailyBreakdown) {
      return [];
    }

    // Group by date
    const grouped = {};
    weeklyData.dailyBreakdown.forEach((day) => {
      const dateObj = new Date(day.date);
      const dateStr = dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }

      grouped[dateStr].push({
        date: day.date,
        calories: day.calories,
        protein: day.protein,
        carbs: day.carbs,
        fats: day.fats,
      });
    });

    // Convert to section list format
    return Object.entries(grouped).map(([title, data]) => ({
      title,
      data,
    }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const handleDeleteItem = (date) => {
    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          // In a real app, you'd call an API to delete this
          // For now, reload the history
          loadHistory();
        },
      },
    ]);
  };

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemDate}>{item.date}</Text>
        <TouchableOpacity onPress={() => handleDeleteItem(item.date)}>
          <Text style={styles.deleteButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.nutritionRow}>
        <View style={[styles.nutritionBox, { backgroundColor: "#e0f2fe" }]}>
          <Text style={styles.nutritionLabel}>Calories</Text>
          <Text style={styles.nutritionValue}>{Math.round(item.calories)}</Text>
        </View>

        <View style={[styles.nutritionBox, { backgroundColor: "#dcfce7" }]}>
          <Text style={styles.nutritionLabel}>Protein</Text>
          <Text style={styles.nutritionValue}>{item.protein.toFixed(1)}g</Text>
        </View>

        <View style={[styles.nutritionBox, { backgroundColor: "#fef3c7" }]}>
          <Text style={styles.nutritionLabel}>Carbs</Text>
          <Text style={styles.nutritionValue}>{item.carbs.toFixed(1)}g</Text>
        </View>

        <View style={[styles.nutritionBox, { backgroundColor: "#fee2e2" }]}>
          <Text style={styles.nutritionLabel}>Fats</Text>
          <Text style={styles.nutritionValue}>{item.fats.toFixed(1)}g</Text>
        </View>
      </View>
    </View>
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan History</Text>
        <Text style={styles.subtitle}>Your last 7 days of food scans</Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>📊</Text>
          <Text style={styles.emptyStateTitle}>No Scans Yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Start scanning food items to see your history
          </Text>
        </View>
      ) : (
        <SectionList
          sections={history}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderHistoryItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          stickySectionHeadersEnabled={false}
        />
      )}
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    paddingLeft: 4,
  },
  historyItem: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemDate: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  deleteButton: {
    fontSize: 18,
    color: "#ef4444",
    fontWeight: "bold",
    padding: 4,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  nutritionBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: "center",
  },
  nutritionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 2,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 64,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
