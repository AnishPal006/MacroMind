// screens/AuthScreen.js

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView, // Ensure this is imported
  Platform, // Ensure this is imported
  ScrollView, // Ensure this is imported
} from "react-native";
import apiService from "../services/api";

export default function AuthScreen({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // *** ENSURE STATE INCLUDES ALL FORM FIELDS ***
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    age: "",
    gender: "other",
    allergiesInput: "", // <-- This property must exist
    healthConditionsInput: "", // <-- This property must exist
  });

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.email || !formData.password) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!isLogin && !formData.fullName) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    setLoading(true);
    try {
      let response;
      if (isLogin) {
        response = await apiService.login(formData.email, formData.password);
      } else {
        // Prepare arrays from comma-separated strings
        const allergies = formData.allergiesInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const healthConditions = formData.healthConditionsInput
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

        response = await apiService.register({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          age: formData.age ? parseInt(formData.age) : null,
          gender: formData.gender,
          allergies: allergies, // Pass as array
          healthConditions: healthConditions, // Pass as array
        });
      }

      if (response.success) {
        Alert.alert("Success", response.message);
        onAuthSuccess?.(response.data.user);
      } else {
        throw new Error(response.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Auth Error:", error);
      Alert.alert("Error", error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>MacroMind</Text>
            <Text style={styles.subtitle}>
              {isLogin ? "Welcome Back" : "Create Account"}
            </Text>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <TextInput
                style={styles.input}
                placeholder="Full Name *" // Placeholder text
                value={formData.fullName}
                onChangeText={(text) =>
                  setFormData({ ...formData, fullName: text })
                }
                autoCapitalize="words"
                placeholderTextColor="#9ca3af" // Add placeholder text color
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Email *" // Placeholder text
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9ca3af" // Add placeholder text color
            />

            <TextInput
              style={styles.input}
              placeholder="Password *" // Placeholder text
              value={formData.password}
              onChangeText={(text) =>
                setFormData({ ...formData, password: text })
              }
              secureTextEntry
              placeholderTextColor="#9ca3af" // Add placeholder text color
            />

            {!isLogin && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Age (optional)"
                  value={formData.age}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      age: text.replace(/[^0-9]/g, ""),
                    })
                  }
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af" // Add placeholder text color
                />

                <View style={styles.genderContainer}>
                  <Text style={styles.label}>Gender:</Text>
                  <View style={styles.genderButtons}>
                    {["male", "female", "other"].map((gender) => (
                      <TouchableOpacity
                        key={gender}
                        style={[
                          styles.genderButton,
                          formData.gender === gender &&
                            styles.genderButtonActive,
                        ]}
                        onPress={() => setFormData({ ...formData, gender })}
                      >
                        <Text
                          style={[
                            styles.genderButtonText,
                            formData.gender === gender &&
                              styles.genderButtonTextActive,
                          ]}
                        >
                          {gender.charAt(0).toUpperCase() + gender.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* New Health Fields */}
                <Text style={styles.label}>Allergies (comma-separated)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Peanuts, Shellfish"
                  value={formData.allergiesInput} // This now correctly binds to state
                  onChangeText={(text) =>
                    setFormData({ ...formData, allergiesInput: text })
                  }
                  autoCapitalize="words"
                  placeholderTextColor="#9ca3af" // Add placeholder text color
                />

                <Text style={styles.label}>
                  Health Conditions (comma-separated)
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Diabetes, High Cholesterol"
                  value={formData.healthConditionsInput} // This now correctly binds to state
                  onChangeText={(text) =>
                    setFormData({ ...formData, healthConditionsInput: text })
                  }
                  autoCapitalize="words"
                  placeholderTextColor="#9ca3af" // Add placeholder text color
                />
              </>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? "Login" : "Sign Up"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.switchButtonText}>
                {isLogin
                  ? "Don't have an account? Sign Up"
                  : "Already have an account? Login"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#6b7280",
  },
  form: {
    width: "100%",
  },
  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    color: "#111827", // Ensure input text is visible
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 6,
    marginLeft: 4,
  },
  genderContainer: {
    marginBottom: 15,
  },
  genderButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  genderButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  genderButtonText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "600",
  },
  genderButtonTextActive: {
    color: "white",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  switchButton: {
    marginTop: 20,
    alignItems: "center",
  },
  switchButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
});
