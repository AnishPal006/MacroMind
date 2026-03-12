import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import apiService from "../services/api";

export default function DashboardScreen({ currentUser, onNavigate }) {
  const [dailyLog, setDailyLog] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [waterMl, setWaterMl] = useState(0);

  const fetchDailySummary = async () => {
    try {
      const response = await apiService.getDailySummary();
      if (response.success) {
        setDailyLog(response.data);
        setWaterMl(response.data.totals?.water || 0);
      }
    } catch (error) {
      console.error("Failed to fetch daily summary:", error);
    }
  };

  useEffect(() => {
    fetchDailySummary();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDailySummary();
    setRefreshing(false);
  };

  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push({
        name: dayNames[d.getDay()],
        date: d.getDate(),
        isToday: i === 0,
      });
    }
    return days;
  };

  // --- STRICT WATER HANDLER ---
  const handleUpdateWater = async (glassesChange) => {
    let currentWater = parseInt(waterMl, 10) || 0;
    let newWaterMl = currentWater + glassesChange * 250;

    if (newWaterMl < 0) newWaterMl = 0;
    if (newWaterMl > 10000) newWaterMl = 10000;

    setWaterMl(newWaterMl);

    try {
      await apiService.logWaterIntake(newWaterMl);
    } catch (error) {
      console.error("Failed to save water", error);
      setWaterMl(currentWater);
    }
  };

  const handleResetWater = async () => {
    Alert.alert(
      "Reset Hydration",
      "Do you want to reset your water intake to 0 for today?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setWaterMl(0);
            await apiService.logWaterIntake(0);
          },
        },
      ],
    );
  };

  // --- MATH & GOALS ---
  const targetCalories = parseInt(currentUser?.dailyCaloricGoal, 10) || 2000;
  const consumedCalories = dailyLog?.totals?.calories
    ? Math.round(dailyLog.totals.calories)
    : 0;
  const progressPercent = Math.min(
    (consumedCalories / targetCalories) * 100,
    100,
  );

  const getMacroTarget = (macroName) => {
    if (macroName === "Protein")
      return parseFloat(currentUser?.proteinGoalGrams) || 50;
    if (macroName === "Carbs")
      return parseFloat(currentUser?.carbsGoalGrams) || 250;
    if (macroName === "Fats")
      return parseFloat(currentUser?.fatsGoalGrams) || 65;
    return 100;
  };

  const targetWaterMl = parseInt(currentUser?.waterIntakeGoalMl, 10) || 2000;
  const targetGlasses = Math.round(targetWaterMl / 250);
  const consumedGlasses = Math.round((parseInt(waterMl, 10) || 0) / 250);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingSub}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <Text style={styles.greetingName}>
              Hi, {currentUser?.fullName?.split(" ")[0] || "User"} 👋
            </Text>
          </View>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => onNavigate("profile")}
          >
            <Feather name="user" size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* --- COMPACT WEEK CALENDAR --- */}
        <View style={styles.weekStrip}>
          {getWeekDays().map((d, i) => (
            <View key={i} style={styles.dayCol}>
              <Text style={[styles.dayName, d.isToday && styles.dayNameActive]}>
                {d.name}
              </Text>
              <View
                style={[
                  styles.dateBubble,
                  d.isToday && styles.dateBubbleActive,
                ]}
              >
                <Text
                  style={[styles.dateText, d.isToday && styles.dateTextActive]}
                >
                  {d.date}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* --- HERO CALORIE CARD (Deep Black) --- */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroTitleRow}>
              <Feather name="activity" size={20} color="#D4EB9B" />
              <Text style={styles.heroTitle}>Today's Calories</Text>
            </View>
            <TouchableOpacity onPress={() => onNavigate("scanner")}>
              <View style={styles.addBtn}>
                <Feather name="plus" size={16} color="#111827" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.heroMain}>
            <Text style={styles.heroBigNumber}>{consumedCalories}</Text>
            <Text style={styles.heroSubText}>/ {targetCalories} kcal</Text>
          </View>

          <View style={styles.heroProgressBg}>
            <View
              style={[
                styles.heroProgressFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
        </View>

        {/* --- BENTO GRID: MACROS & WATER --- */}
        <View style={styles.bentoGrid}>
          {/* LEFT: MACROS CARD */}
          <View style={styles.macrosCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Macros</Text>
              <Feather name="pie-chart" size={18} color="#9CA3AF" />
            </View>

            <View style={styles.macrosList}>
              {["Protein", "Carbs", "Fats"].map((macro, idx) => {
                const val = dailyLog?.totals?.[macro.toLowerCase()] || 0;
                const target = getMacroTarget(macro);
                const percent =
                  target > 0 ? Math.min((val / target) * 100, 100) : 0;
                const barColor =
                  idx === 0 ? "#D4EB9B" : idx === 1 ? "#93C5FD" : "#FCA5A5";

                return (
                  <View key={idx} style={styles.macroRow}>
                    <View style={styles.macroTextRow}>
                      <Text style={styles.macroLabel}>{macro}</Text>
                      <Text style={styles.macroValue}>
                        {Math.round(val)}/{target}g
                      </Text>
                    </View>
                    <View style={styles.miniProgressBg}>
                      <View
                        style={[
                          styles.miniProgressFill,
                          { width: `${percent}%`, backgroundColor: barColor },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* RIGHT: WATER CARD */}
          <View style={styles.waterCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Hydration</Text>
              <TouchableOpacity
                onLongPress={handleResetWater}
                delayLongPress={500}
              >
                <Feather name="droplet" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>

            <View style={styles.waterMain}>
              <Text style={styles.waterBigNumber}>{consumedGlasses}</Text>
              <Text style={styles.waterSubText}>/ {targetGlasses} gls</Text>
            </View>
            <Text style={styles.waterMlText}>{waterMl} ml total</Text>

            <View style={styles.waterControls}>
              <TouchableOpacity
                style={styles.waterBtn}
                onPress={() => handleUpdateWater(-1)}
              >
                <Feather name="minus" size={20} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.waterBtn}
                onPress={() => handleUpdateWater(1)}
              >
                <Feather name="plus" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAF9" },
  container: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 30,
    paddingBottom: 120, // Space for bottom nav
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greetingSub: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  greetingName: { fontSize: 26, fontWeight: "800", color: "#111827" },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Week Strip
  weekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  dayCol: { alignItems: "center" },
  dayName: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "700",
    marginBottom: 8,
  },
  dayNameActive: { color: "#111827" },
  dateBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  dateBubbleActive: { backgroundColor: "#D4EB9B" },
  dateText: { fontSize: 14, fontWeight: "700", color: "#4B5563" },
  dateTextActive: { color: "#111827" },

  // Hero Card (Dark Mode)
  heroCard: {
    backgroundColor: "#111827",
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#D4EB9B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitleRow: { flexDirection: "row", alignItems: "center" },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  addBtn: {
    backgroundColor: "#D4EB9B",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  heroMain: { flexDirection: "row", alignItems: "baseline", marginBottom: 20 },
  heroBigNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: "#D4EB9B",
    letterSpacing: -1,
  },
  heroSubText: {
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "600",
    marginLeft: 8,
  },
  heroProgressBg: {
    height: 8,
    backgroundColor: "#374151",
    borderRadius: 4,
    overflow: "hidden",
  },
  heroProgressFill: {
    height: "100%",
    backgroundColor: "#D4EB9B",
    borderRadius: 4,
  },

  // Bento Grid
  bentoGrid: { flexDirection: "row", justifyContent: "space-between" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },

  // Macros Card (Left)
  macrosCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  macrosList: { flex: 1, justifyContent: "space-between" },
  macroRow: { marginBottom: 12 },
  macroTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  macroLabel: { fontSize: 13, fontWeight: "700", color: "#4B5563" },
  macroValue: { fontSize: 13, fontWeight: "800", color: "#111827" },
  miniProgressBg: { height: 6, backgroundColor: "#F3F4F6", borderRadius: 3 },
  miniProgressFill: { height: "100%", borderRadius: 3 },

  // Water Card (Right)
  waterCard: {
    flex: 1,
    backgroundColor: "#E0F2FE",
    borderRadius: 24,
    padding: 20,
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  waterMain: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginTop: 4,
  },
  waterBigNumber: { fontSize: 36, fontWeight: "800", color: "#111827" },
  waterSubText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "700",
    marginLeft: 4,
  },
  waterMlText: {
    textAlign: "center",
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 16,
  },
  waterControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  waterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
});
