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
import ScannerScreen from "./screens/ScannerScreen";
import AuthScreen from "./screens/AuthScreen";
import DashboardScreen from "./screens/DashboardScreen";
import ProfileScreen from "./screens/ProfileScreen";
import HistoryScreen from "./screens/HistoryScreen";
import InventoryScreen from "./screens/InventoryScreen"; // <-- Import InventoryScreen
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  const renderScreen = () => {
    switch (currentTab) {
      case "dashboard":
        return <DashboardScreen currentUser={currentUser} />;
      case "scanner":
        return <ScannerScreen />;
      case "history":
        return <HistoryScreen />;
      case "inventory": // <-- Add case for Inventory
        return <InventoryScreen />;
      case "profile":
        return <ProfileScreen onLogout={handleLogout} />;
      default:
        return <DashboardScreen currentUser={currentUser} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[
            styles.navButton,
            currentTab === "dashboard" && styles.navButtonActive,
          ]}
          onPress={() => setCurrentTab("dashboard")}
        >
          <Text
            style={[
              styles.navButtonText,
              currentTab === "dashboard" && styles.navButtonTextActive,
            ]}
          >
            📊 Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            currentTab === "scanner" && styles.navButtonActive,
          ]}
          onPress={() => setCurrentTab("scanner")}
        >
          <Text
            style={[
              styles.navButtonText,
              currentTab === "scanner" && styles.navButtonTextActive,
            ]}
          >
            📷 Scan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            currentTab === "history" && styles.navButtonActive,
          ]}
          onPress={() => setCurrentTab("history")}
        >
          <Text
            style={[
              styles.navButtonText,
              currentTab === "history" && styles.navButtonTextActive,
            ]}
          >
            📜 History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            currentTab === "inventory" && styles.navButtonActive,
          ]}
          onPress={() => setCurrentTab("inventory")}
        >
          <Text
            style={[
              styles.navButtonText,
              currentTab === "inventory" && styles.navButtonTextActive,
            ]}
          >
            🧺 Inventory {/* Example Icon */}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            currentTab === "profile" && styles.navButtonActive,
          ]}
          onPress={() => setCurrentTab("profile")}
        >
          <Text
            style={[
              styles.navButtonText,
              currentTab === "profile" && styles.navButtonTextActive,
            ]}
          >
            👤 Profile
          </Text>
        </TouchableOpacity>
      </View>

      <StatusBar style="auto" />
    </View>
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
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingBottom: Platform.OS === "ios" ? 30 : 20, // More padding for iOS home indicator
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, // Subtle shadow
    shadowRadius: 5,
    elevation: 8,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8, // Adjust vertical padding
  },
  navButtonActive: {
    // Optional: Use a different indicator like background color or borderTopWidth
    backgroundColor: "#eef2ff", // Example active background
    borderTopWidth: 3, // Example active border top
    borderTopColor: "#007AFF",
    paddingTop: 7, // Adjust padding if using borderTop
    // Remove bottom border if using top border or background
    // borderBottomWidth: 3,
    // borderBottomColor: "#007AFF",
  },
  navButtonText: {
    fontSize: 11, // Slightly smaller font size for 5 tabs
    color: "#6b7280",
    fontWeight: "600",
    textAlign: "center", // Ensure text centers if it wraps
  },
  navButtonTextActive: {
    color: "#007AFF",
    fontWeight: "700", // Make active text bolder
  },
});
