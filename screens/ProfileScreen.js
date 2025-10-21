import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import apiService from "../services/api";

export default function ProfileScreen({ onLogout }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    age: "",
    gender: "other",
    // Use strings for input, derive from arrays fetched from API
    healthConditionsInput: "",
    allergiesInput: "",
  });
  const [goals, setGoals] = useState({
    dailyCaloricGoal: "",
    proteinGoalGrams: "",
    carbsGoalGrams: "",
    fatsGoalGrams: "",
    waterIntakeGoalMl: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileRes, goalsRes] = await Promise.all([
        apiService.getProfile(),
        apiService.getGoals(),
      ]);

      if (profileRes.success) {
        setProfile({
          fullName: profileRes.data.fullName || "",
          age: profileRes.data.age?.toString() || "",
          gender: profileRes.data.gender || "other",
          // Convert arrays to comma-separated strings for input fields
          healthConditionsInput: (profileRes.data.healthConditions || []).join(
            ", "
          ),
          allergiesInput: (profileRes.data.allergies || []).join(", "),
        });
      }

      if (goalsRes.success) {
        setGoals({
          dailyCaloricGoal: goalsRes.data.dailyCaloricGoal?.toString() || "",
          proteinGoalGrams: goalsRes.data.proteinGoalGrams?.toString() || "",
          carbsGoalGrams: goalsRes.data.carbsGoalGrams?.toString() || "",
          fatsGoalGrams: goalsRes.data.fatsGoalGrams?.toString() || "",
          waterIntakeGoalMl: goalsRes.data.waterIntakeGoalMl?.toString() || "",
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Convert input strings back to arrays, trimming whitespace and filtering empty strings
      const healthConditionsArray = profile.healthConditionsInput
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const allergiesArray = profile.allergiesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const profileData = {
        fullName: profile.fullName,
        age: profile.age ? parseInt(profile.age) : null,
        gender: profile.gender,
        healthConditions: healthConditionsArray, // Send array
        allergies: allergiesArray, // Send array
        // dietaryPreferences are not in the state/form currently, add if needed
      };

      const response = await apiService.updateProfile(profileData);
      if (response.success) {
        Alert.alert("Success", "Profile updated successfully");
        // Optionally update local state again from response if needed, though loadProfile on focus would handle it
        setProfile({
          // Update local state to reflect saved data format
          ...profile, // Keep existing fields like name, age, gender
          healthConditionsInput: (response.data.healthConditions || []).join(
            ", "
          ),
          allergiesInput: (response.data.allergies || []).join(", "),
        });
      } else {
        throw new Error(response.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Update Profile Error:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoals = async () => {
    setSaving(true);
    try {
      const goalsData = {
        dailyCaloricGoal: parseInt(goals.dailyCaloricGoal),
        proteinGoalGrams: parseFloat(goals.proteinGoalGrams),
        carbsGoalGrams: parseFloat(goals.carbsGoalGrams),
        fatsGoalGrams: parseFloat(goals.fatsGoalGrams),
        waterIntakeGoalMl: parseInt(goals.waterIntakeGoalMl),
      };

      const response = await apiService.updateGoals(goalsData);
      if (response.success) {
        Alert.alert("Success", "Goals updated successfully");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update goals");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await apiService.logout();
          onLogout?.();
        },
      },
    ]);
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Profile Settings</Text>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={profile.fullName}
            onChangeText={(text) => setProfile({ ...profile, fullName: text })}
          />

          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="Age"
            value={profile.age}
            onChangeText={(text) =>
              setProfile({ ...profile, age: text.replace(/[^0-9]/g, "") })
            }
            keyboardType="numeric"
          />

          <View style={styles.genderContainer}>
            <Text style={styles.label}>Gender:</Text>
            <View style={styles.genderButtons}>
              {["male", "female", "other"].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.genderButton,
                    profile.gender === gender && styles.genderButtonActive,
                  ]}
                  onPress={() => setProfile({ ...profile, gender })}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      profile.gender === gender &&
                        styles.genderButtonTextActive,
                    ]}
                  >
                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {/* ADDED: Allergies Input */}
          <Text style={styles.label}>Allergies (comma-separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Peanuts, Shellfish, Dairy"
            value={profile.allergiesInput}
            onChangeText={(text) =>
              setProfile({ ...profile, allergiesInput: text })
            }
            autoCapitalize="words"
          />

          {/* ADDED: Health Conditions Input */}
          <Text style={styles.label}>Health Conditions (comma-separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Diabetes, High Cholesterol"
            value={profile.healthConditionsInput}
            onChangeText={(text) =>
              setProfile({ ...profile, healthConditionsInput: text })
            }
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} // Added disabled style
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Goals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Goals</Text>

          <View style={styles.goalItem}>
            <Text style={styles.label}>Daily Calories</Text>
            <TextInput
              style={styles.input}
              placeholder="2000"
              value={goals.dailyCaloricGoal}
              onChangeText={(text) =>
                setGoals({ ...goals, dailyCaloricGoal: text })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.goalItem}>
            <Text style={styles.label}>Protein (grams)</Text>
            <TextInput
              style={styles.input}
              placeholder="50"
              value={goals.proteinGoalGrams}
              onChangeText={(text) =>
                setGoals({ ...goals, proteinGoalGrams: text })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.goalItem}>
            <Text style={styles.label}>Carbs (grams)</Text>
            <TextInput
              style={styles.input}
              placeholder="250"
              value={goals.carbsGoalGrams}
              onChangeText={(text) =>
                setGoals({ ...goals, carbsGoalGrams: text })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.goalItem}>
            <Text style={styles.label}>Fats (grams)</Text>
            <TextInput
              style={styles.input}
              placeholder="65"
              value={goals.fatsGoalGrams}
              onChangeText={(text) =>
                setGoals({ ...goals, fatsGoalGrams: text })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.goalItem}>
            <Text style={styles.label}>Water (ml)</Text>
            <TextInput
              style={styles.input}
              placeholder="2000"
              value={goals.waterIntakeGoalMl}
              onChangeText={(text) =>
                setGoals({ ...goals, waterIntakeGoalMl: text })
              }
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveGoals}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save Goals</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 24,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 12, // Adjust padding
    paddingHorizontal: 15,
    borderRadius: 8, // Adjust border radius
    fontSize: 16,
    marginBottom: 16, // Increase spacing
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  label: {
    // Add label style if it wasn't there before
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 6,
    marginLeft: 4,
  },
  genderContainer: {
    marginBottom: 16,
  },
  genderButtons: {
    flexDirection: "row",
    gap: 10,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  genderButtonActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#007AFF",
  },
  genderButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  genderButtonTextActive: {
    color: "#007AFF",
  },
  goalItem: {
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12, // Add some top margin
  },
  saveButtonDisabled: {
    backgroundColor: "#9ca3af", // Style for when saving
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#ef4444",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 40,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
