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
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
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
  const refreshUser = async () => {
    try {
      const response = await apiService.getCurrentUser();
      if (response.success) {
        setCurrentUser(response.data);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
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
        return (
          <DashboardScreen
            currentUser={currentUser}
            onNavigate={setCurrentTab}
          />
        );
      case "scanner":
        return <ScannerScreen onNavigate={setCurrentTab} />; // <-- Passed onNavigate here!
      case "history":
        return <HistoryScreen />;
      case "inventory":
        return <InventoryScreen />;
      case "profile":
        return (
          <ProfileScreen
            onLogout={handleLogout}
            onProfileUpdate={refreshUser}
          />
        );
      default:
        return (
          <DashboardScreen
            currentUser={currentUser}
            onNavigate={setCurrentTab}
          />
        );
    }
  };

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

          {/* Conditionally hide the bottom nav if we are on the scanner screen */}
          {currentTab !== "scanner" && (
            <View style={styles.bottomNavContainer}>
              <View style={styles.bottomNav}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => setCurrentTab("dashboard")}
                >
                  <Feather
                    name="home"
                    size={24}
                    color={currentTab === "dashboard" ? "#111827" : "#9CA3AF"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => setCurrentTab("history")}
                >
                  <Feather
                    name="bar-chart-2"
                    size={24}
                    color={currentTab === "history" ? "#111827" : "#9CA3AF"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.scanButtonFloating}
                  onPress={() => setCurrentTab("scanner")}
                >
                  <Feather name="maximize" size={24} color="#D4EB9B" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => setCurrentTab("profile")}
                >
                  <Feather
                    name="user"
                    size={24}
                    color={currentTab === "profile" ? "#111827" : "#9CA3AF"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => setCurrentTab("inventory")}
                >
                  <Feather
                    name="archive"
                    size={24}
                    color={currentTab === "inventory" ? "#111827" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <StatusBar style="auto" />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAF9",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAF9",
  },
  bottomNavContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 30 : 20,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 40,
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonFloating: {
    backgroundColor: "#111827",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -45,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});
