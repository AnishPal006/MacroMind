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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import apiService from "../services/api";

export default function AuthScreen({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    age: "",
    gender: "other", // Default value
    allergiesInput: "", // New field for comma-separated allergies
    healthConditionsInput: "", // New field for comma-separated conditions (e.g., diabetes, high_cholesterol)
  });

  const handleSubmit = async () => {
    // Basic validation (keep existing checks)
    if (
      !formData.email ||
      !formData.password ||
      (!isLogin && !formData.fullName)
    ) {
      Alert.alert("Error", "Please fill in Email, Password, and Full Name");
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
          .filter(Boolean); // Store conditions in lowercase

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
        // Handle specific backend errors if needed
        throw new Error(response.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Auth Error:", error); // Log the full error
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
                placeholder="Full Name *"
                value={formData.fullName}
                onChangeText={(text) =>
                  setFormData({ ...formData, fullName: text })
                }
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Email *"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Password *"
              value={formData.password}
              onChangeText={(text) =>
                setFormData({ ...formData, password: text })
              }
              secureTextEntry
            />

            {!isLogin && (
              <>
                {/* Keep Age and Gender inputs */}
                <TextInput
                  style={styles.input}
                  placeholder="Age (optional)"
                  value={formData.age}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      age: text.replace(/[^0-9]/g, ""),
                    })
                  } // Only allow numbers
                  keyboardType="numeric"
                />
                <View style={styles.genderContainer}>
                  {/* ... Gender Buttons ... */}
                </View>

                {/* New Health Fields */}
                <Text style={styles.label}>
                  Allergies (comma-separated, e.g., peanuts, dairy)
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Peanuts, Shellfish"
                  value={formData.allergiesInput}
                  onChangeText={(text) =>
                    setFormData({ ...formData, allergiesInput: text })
                  }
                  autoCapitalize="words"
                />

                <Text style={styles.label}>
                  Health Conditions (comma-separated)
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Diabetes, High Cholesterol"
                  value={formData.healthConditionsInput}
                  onChangeText={(text) =>
                    setFormData({ ...formData, healthConditionsInput: text })
                  }
                  autoCapitalize="words" // Capitalize words, but we'll lowercase conditions later
                />
              </>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton, // Style for the blue button
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                // THIS PART SHOULD BE RENDERING THE TEXT
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
                  ? "Don't have an account? Sign Up" // This text should appear in login mode
                  : "Already have an account? Login"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
  },
  label: {
    fontSize: 14, // Slightly smaller label
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 6,
    marginLeft: 4, // Align with input padding
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
    color: "white", // Text color is white
    fontSize: 18,
    fontWeight: "bold",
  },
  switchButton: {
    marginTop: 20, // Should have space above it
    alignItems: "center",
  },
  switchButtonText: {
    color: "#007AFF", // Text color is blue
    fontSize: 16,
  },
});
