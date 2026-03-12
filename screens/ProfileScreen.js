import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import apiService from "../services/api";

export default function ProfileScreen({ onLogout, onProfileUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    allergies: "",
    healthConditions: "",
    dietaryPreferences: "",
    dailyCaloricGoal: "",
    proteinGoalGrams: "",
    carbsGoalGrams: "",
    fatsGoalGrams: "",
    waterIntakeGoalMl: "",
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await apiService.getCurrentUser();
      if (response.success && response.data) {
        const user = response.data;
        setFormData({
          fullName: user.fullName || "",
          allergies: (user.allergies || []).join(", "),
          healthConditions: (user.healthConditions || []).join(", "),
          dietaryPreferences: (user.dietaryPreferences || []).join(", "),
          dailyCaloricGoal: user.dailyCaloricGoal?.toString() || "",
          proteinGoalGrams: user.proteinGoalGrams?.toString() || "",
          carbsGoalGrams: user.carbsGoalGrams?.toString() || "",
          fatsGoalGrams: user.fatsGoalGrams?.toString() || "",
          waterIntakeGoalMl: user.waterIntakeGoalMl?.toString() || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        fullName: formData.fullName,
        allergies: formData.allergies
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
        healthConditions: formData.healthConditions
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
        dietaryPreferences: formData.dietaryPreferences
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
        dailyCaloricGoal: parseInt(formData.dailyCaloricGoal) || 2000,
        proteinGoalGrams: parseInt(formData.proteinGoalGrams) || 150,
        carbsGoalGrams: parseInt(formData.carbsGoalGrams) || 200,
        fatsGoalGrams: parseInt(formData.fatsGoalGrams) || 65,
        waterIntakeGoalMl: parseInt(formData.waterIntakeGoalMl) || 2500,
      };

      const response = await apiService.updateProfile(payload);
      if (response.success) {
        Alert.alert("Success", "Profile updated successfully!");
        setIsEditing(false);
        if (onProfileUpdate) onProfileUpdate();
      } else {
        Alert.alert("Error", response.message || "Failed to update profile.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );

  const renderField = (
    label,
    key,
    keyboardType = "default",
    placeholder = "",
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {isEditing ? (
        <TextInput
          style={styles.input}
          value={formData[key]}
          onChangeText={(text) => setFormData({ ...formData, [key]: text })}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
        />
      ) : (
        <Text style={styles.fieldValue}>
          {formData[key] || "Not specified"}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Feather
            name={isEditing ? "x" : "edit-2"}
            size={20}
            color="#111827"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* THE NEW DEEP BLACK HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            <Feather name="user" size={40} color="#111827" />
          </View>
          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={formData.fullName}
              onChangeText={(text) =>
                setFormData({ ...formData, fullName: text })
              }
              placeholder="Your Name"
              placeholderTextColor="#9CA3AF"
            />
          ) : (
            <Text style={styles.userName}>{formData.fullName || "User"}</Text>
          )}
          <Text style={styles.userSubText}>MacroMind Member</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="heart" size={20} color="#EF4444" />
            <Text style={styles.cardTitle}>Health Profile</Text>
          </View>
          {renderField(
            "Allergies (comma separated)",
            "allergies",
            "default",
            "e.g., Peanuts",
          )}
          {renderField(
            "Health Conditions",
            "healthConditions",
            "default",
            "e.g., Diabetes",
          )}
          {renderField(
            "Dietary Preferences",
            "dietaryPreferences",
            "default",
            "e.g., Vegan",
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="target" size={20} color="#10B981" />
            <Text style={styles.cardTitle}>Daily Dietary Goals</Text>
          </View>
          {renderField("Daily Calories (kcal)", "dailyCaloricGoal", "numeric")}
          {renderField("Protein (g)", "proteinGoalGrams", "numeric")}
          {renderField("Carbs (g)", "carbsGoalGrams", "numeric")}
          {renderField("Fats (g)", "fatsGoalGrams", "numeric")}
          {renderField("Water Intake (ml)", "waterIntakeGoalMl", "numeric")}
        </View>

        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#D4EB9B" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Feather
            name="log-out"
            size={20}
            color="#EF4444"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAF9" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAF9",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#111827" },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 130 },

  // NEW DARK HERO STYLES
  heroCard: {
    backgroundColor: "#111827",
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#D4EB9B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#D4EB9B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  userName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  userSubText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  nameInput: {
    fontSize: 26,
    fontWeight: "800",
    color: "#D4EB9B",
    textAlign: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#D4EB9B",
    minWidth: 200,
    paddingVertical: 4,
    marginBottom: 4,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 12,
  },
  fieldContainer: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "600",
    marginBottom: 8,
  },
  fieldValue: { fontSize: 16, color: "#111827", fontWeight: "600" },
  input: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // DARK SAVE BUTTON
  saveButton: {
    backgroundColor: "#111827",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: "#D4EB9B", fontSize: 16, fontWeight: "800" },

  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutText: { color: "#EF4444", fontSize: 16, fontWeight: "700" },
});
