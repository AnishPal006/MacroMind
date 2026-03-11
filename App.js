import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context"; // <-- Added Provider
import { Feather } from "@expo/vector-icons"; // <-- Added Vector Icons
import ScannerScreen from "./screens/ScannerScreen";
import AuthScreen from "./screens/AuthScreen";
import DashboardScreen from "./screens/DashboardScreen";
import ProfileScreen from "./screens/ProfileScreen";
import HistoryScreen from "./screens/HistoryScreen";
import InventoryScreen from "./screens/InventoryScreen";
import apiService from "./services/api";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("dashboard");

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await apiService.getToken();
      if (token) {
        const response = await apiService.getCurrentUser();
        if (response.success) {
          setCurrentUser(response.data);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.log("Not authenticated");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentTab("dashboard");
  };

  const renderScreen = () => {
    switch (currentTab) {
      case "dashboard":
        // <-- Passed onNavigate here
        return (
          <DashboardScreen
            currentUser={currentUser}
            onNavigate={setCurrentTab}
          />
        );
      case "scanner":
        return <ScannerScreen />;
      case "history":
        return <HistoryScreen />;
      case "inventory":
        return <InventoryScreen />;
      case "profile":
        return <ProfileScreen onLogout={handleLogout} />;
      default:
        // <-- Passed onNavigate here
        return (
          <DashboardScreen
            currentUser={currentUser}
            onNavigate={setCurrentTab}
          />
        );
    }
  };

  // Wrapped the entire output in SafeAreaProvider to prevent freezing bugs
  return (
    <SafeAreaProvider>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : !isAuthenticated ? (
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      ) : (
        <View style={styles.container}>
          {renderScreen()}

          {/* Modern Minimalist Bottom Navigation */}
          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentTab("dashboard")}
            >
              <Feather
                name="grid"
                size={22}
                color={currentTab === "dashboard" ? "#111827" : "#9CA3AF"}
              />
              <Text
                style={[
                  styles.navButtonText,
                  currentTab === "dashboard" && styles.navButtonTextActive,
                ]}
              >
                Dashboard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentTab("scanner")}
            >
              <Feather
                name="maximize"
                size={22}
                color={currentTab === "scanner" ? "#007AFF" : "#9CA3AF"}
              />
              <Text
                style={[
                  styles.navButtonText,
                  currentTab === "scanner" && styles.scanTextActive,
                ]}
              >
                Scan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentTab("history")}
            >
              <Feather
                name="clock"
                size={22}
                color={currentTab === "history" ? "#111827" : "#9CA3AF"}
              />
              <Text
                style={[
                  styles.navButtonText,
                  currentTab === "history" && styles.navButtonTextActive,
                ]}
              >
                History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentTab("inventory")}
            >
              <Feather
                name="archive"
                size={22}
                color={currentTab === "inventory" ? "#111827" : "#9CA3AF"}
              />
              <Text
                style={[
                  styles.navButtonText,
                  currentTab === "inventory" && styles.navButtonTextActive,
                ]}
              >
                Inventory
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setCurrentTab("profile")}
            >
              <Feather
                name="user"
                size={22}
                color={currentTab === "profile" ? "#111827" : "#9CA3AF"}
              />
              <Text
                style={[
                  styles.navButtonText,
                  currentTab === "profile" && styles.navButtonTextActive,
                ]}
              >
                Profile
              </Text>
            </TouchableOpacity>
          </View>

          <StatusBar style="auto" />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB", // Minimalist off-white background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingBottom: Platform.OS === "ios" ? 30 : 15,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04, // Very soft shadow
    shadowRadius: 15,
    elevation: 10,
    borderTopWidth: 0, // Removed harsh border
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4, // Space between icon and text
  },
  navButtonText: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
    marginTop: 2,
  },
  navButtonTextActive: {
    color: "#111827", // Almost black for standard active tabs
    fontWeight: "700",
  },
  scanTextActive: {
    color: "#007AFF", // Keep blue for the primary action tab
    fontWeight: "700",
  },
});
