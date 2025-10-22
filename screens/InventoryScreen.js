// screens/InventoryScreen.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal as RNModal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import apiService from "../services/api";
// Import AsyncStorage
import AsyncStorage from "@react-native-async-storage/async-storage";

// Helper to format dates
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString + "T00:00:00").toLocaleDateString();
  } catch (e) {
    return "Invalid Date";
  }
};

export default function InventoryScreen() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsModalVisible, setSuggestionsModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    itemName: "",
    quantity: "",
    unit: "pieces",
    expiryDate: "",
  });

  // --- (loadInventory, useEffect, onRefresh, closeModal, handleAddItem, handleEditItem, handleSaveItem, handleDeleteItem, renderItem, renderEmptyList all remain the same) ---
  const loadInventory = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const response = await apiService.getInventory();
      if (response.success && Array.isArray(response.data)) {
        setInventoryItems(response.data);
      } else {
        setInventoryItems([]);
        Alert.alert("Error", response.message || "Failed to load inventory");
      }
    } catch (error) {
      console.error("Load inventory error:", error);
      Alert.alert("Error", error.message || "Could not fetch inventory");
      setInventoryItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadInventory(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setIsEditing(false);
    setCurrentItem(null);
    setFormData({ itemName: "", quantity: "", unit: "pieces", expiryDate: "" });
  };

  const handleAddItem = () => {
    setIsEditing(false);
    setCurrentItem(null);
    setFormData({ itemName: "", quantity: "", unit: "pieces", expiryDate: "" });
    setModalVisible(true);
  };

  const handleEditItem = (item) => {
    setIsEditing(true);
    setCurrentItem(item);
    setFormData({
      itemName: item.itemName || "",
      quantity: item.quantity?.toString() || "",
      unit: item.unit || "pieces",
      expiryDate: item.expiryDate || "",
    });
    setModalVisible(true);
  };

  const handleSaveItem = async () => {
    if (!formData.itemName || !formData.quantity) {
      Alert.alert("Error", "Item name and quantity are required.");
      return;
    }
    const dataToSend = {
      itemName: formData.itemName,
      quantity: parseFloat(formData.quantity) || 0,
      unit: formData.unit || "pieces",
      expiryDate: /^\d{4}-\d{2}-\d{2}$/.test(formData.expiryDate)
        ? formData.expiryDate
        : null,
    };
    setLoading(true);
    try {
      let response;
      if (isEditing && currentItem) {
        response = await apiService.updateInventoryItem(
          currentItem.id,
          dataToSend
        );
      } else {
        response = await apiService.addInventoryItem(dataToSend);
      }
      if (response.success) {
        closeModal();
        loadInventory();
      } else {
        Alert.alert("Error", response.message || "Failed to save item.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Save inventory item error:", error);
      Alert.alert("Error", error.message || "Could not save item.");
      setLoading(false);
    }
  };

  const handleDeleteItem = (itemId) => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            const response = await apiService.deleteInventoryItem(itemId);
            if (response.success) {
              loadInventory();
            } else {
              Alert.alert(
                "Error",
                response.message || "Failed to delete item."
              );
              setLoading(false);
            }
          } catch (error) {
            console.error("Delete inventory item error:", error);
            Alert.alert("Error", error.message || "Could not delete item.");
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemName}>{item.itemName}</Text>
        <Text style={styles.itemDetails}>
          Quantity: {item.quantity} {item.unit || ""}
        </Text>
        <Text style={styles.itemDetails}>
          Expiry: {formatDate(item.expiryDate)}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          onPress={() => handleEditItem(item)}
          style={styles.actionButton}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteItem(item.id)}
          style={styles.actionButton}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>🧺</Text>
      <Text style={styles.emptyTitle}>Your inventory is empty.</Text>
      <Text style={styles.emptySubtitle}>Tap '+' to add your first item!</Text>
    </View>
  );

  // *** MODIFIED fetchMealSuggestions function ***
  const fetchMealSuggestions = async () => {
    setSuggestionsLoading(true);
    setSuggestions([]);
    setSuggestionsModalVisible(true);

    try {
      // 1. Get current inventory items from state
      const currentItemNames = [
        ...new Set(inventoryItems.map((item) => item.itemName)),
      ]
        .sort()
        .join(",");

      // 2. Get cached data
      const cachedSuggestionsJSON = await AsyncStorage.getItem(
        "cachedMealSuggestions"
      );
      const cachedInventoryString = await AsyncStorage.getItem(
        "cachedInventoryString"
      );
      const cachedSuggestions = cachedSuggestionsJSON
        ? JSON.parse(cachedSuggestionsJSON)
        : null;

      // 3. Compare current inventory with cached inventory string
      if (cachedInventoryString === currentItemNames && cachedSuggestions) {
        // 4. Use cache if inventories match
        console.log("Using cached meal suggestions.");
        setSuggestions(cachedSuggestions);
      } else {
        // 5. Fetch new data if inventories differ or cache is empty
        console.log("Fetching new meal suggestions from API.");
        const response = await apiService.getMealSuggestions();

        if (
          response.success &&
          Array.isArray(response.data) &&
          response.data.length > 0
        ) {
          // Check if it's an error/info message from our service
          if (
            response.data[0]?.type === "Error" ||
            response.data[0]?.type === "Info"
          ) {
            setSuggestions(response.data);
          } else {
            // 6. Save new data to cache
            setSuggestions(response.data);
            await AsyncStorage.setItem(
              "cachedMealSuggestions",
              JSON.stringify(response.data)
            );
            await AsyncStorage.setItem(
              "cachedInventoryString",
              currentItemNames
            );
          }
        } else if (response.data?.length === 0) {
          setSuggestions([]); // Handle empty array from API
        } else {
          // Handle API error
          const errorMsg =
            response.message ||
            (response.data && response.data[0]?.description) ||
            "Could not get suggestions.";
          setSuggestions([
            { mealName: "Info", description: errorMsg, type: "Info" },
          ]);
        }
      }
    } catch (error) {
      console.error("Fetch suggestions error:", error);
      Alert.alert("Error", "Could not fetch meal suggestions.");
      setSuggestions([
        {
          mealName: "Error",
          description: "Failed to fetch suggestions.",
          type: "Error",
        },
      ]);
    } finally {
      setSuggestionsLoading(false);
    }
  };
  // *** END MODIFIED function ***

  // --- Main Render ---
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Inventory</Text>
        <TouchableOpacity onPress={handleAddItem} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Suggest Meals Button */}
      <View style={styles.suggestionButtonContainer}>
        <TouchableOpacity
          style={[
            styles.suggestionButton,
            (loading || refreshing || inventoryItems.length === 0) &&
              styles.suggestionButtonDisabled,
          ]}
          onPress={fetchMealSuggestions}
          disabled={loading || refreshing || inventoryItems.length === 0}
        >
          <Text style={styles.suggestionButtonText}>
            🍳 Get Meal Suggestions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {loading && !refreshing && (
        <ActivityIndicator
          size="large"
          color="#007AFF"
          style={styles.loadingIndicator}
        />
      )}

      {/* Inventory List */}
      <FlatList
        data={inventoryItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={!loading ? renderEmptyList : null}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#007AFF"]}
          />
        }
      />

      {/* Add/Edit Modal */}
      <RNModal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isEditing ? "Edit Item" : "Add New Item"}
            </Text>

            <Text style={styles.label}>Item Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Apples, Milk"
              value={formData.itemName}
              onChangeText={(text) =>
                setFormData({ ...formData, itemName: text })
              }
            />

            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>Quantity *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 5, 1.5"
                  value={formData.quantity}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      quantity: text.replace(/[^0-9.]/g, ""),
                    })
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.column}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., pieces, kg, L"
                  value={formData.unit}
                  onChangeText={(text) =>
                    setFormData({ ...formData, unit: text })
                  }
                />
              </View>
            </View>

            <Text style={styles.label}>Expiry Date (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formData.expiryDate}
              onChangeText={(text) =>
                setFormData({ ...formData, expiryDate: text })
              }
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveItem}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </RNModal>

      {/* Meal Suggestions Modal */}
      <RNModal
        animationType="slide"
        transparent={true}
        visible={suggestionsModalVisible}
        onRequestClose={() => setSuggestionsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.suggestionsModalContent}>
            <Text style={styles.modalTitle}>Meal Suggestions</Text>
            {suggestionsLoading ? (
              <ActivityIndicator size="large" color="#10B981" />
            ) : (
              <ScrollView>
                {suggestions.length > 0 ? (
                  suggestions.map((suggestion, index) => (
                    <View key={index} style={styles.suggestionItem}>
                      <Text style={styles.suggestionName}>
                        {suggestion.mealName}
                      </Text>
                      <Text style={styles.suggestionType}>
                        {suggestion.type} ({suggestion.estimatedPrepTime})
                      </Text>
                      <Text style={styles.suggestionDesc}>
                        {suggestion.description}
                      </Text>
                      {suggestion.primaryIngredients &&
                        suggestion.primaryIngredients.length > 0 && (
                          <Text style={styles.suggestionIngredients}>
                            Uses: {suggestion.primaryIngredients.join(", ")}
                          </Text>
                        )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.suggestionDesc}>
                    No suggestions available based on your current inventory.
                  </Text>
                )}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 15 }]}
              onPress={() => setSuggestionsModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </RNModal>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 25 : 20,
    paddingBottom: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  addButton: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "bold",
  },
  loadingIndicator: {
    marginTop: 50,
  },
  suggestionButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  suggestionButton: {
    backgroundColor: "#FF6347", // Tomato Red
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  suggestionButtonDisabled: {
    backgroundColor: "#cccccc",
    elevation: 0,
    shadowOpacity: 0,
  },
  suggestionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  itemContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1.5,
  },
  itemTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 2,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  editButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  deleteButtonText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "30%",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 54,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 24,
    paddingTop: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionsModalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 24,
    paddingTop: 20,
    width: "100%",
    maxWidth: 500,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#1f2937",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#374151",
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#f9fafb",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  column: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    // flex: 1, // This was the problematic style
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4b5563",
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  suggestionItem: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 3,
  },
  suggestionType: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 5,
    fontStyle: "italic",
  },
  suggestionDesc: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  suggestionIngredients: {
    fontSize: 12,
    color: "#374151",
    marginTop: 5,
    fontWeight: "500",
  },
});
