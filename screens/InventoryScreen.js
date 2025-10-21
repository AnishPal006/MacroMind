// screens/InventoryScreen.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList, // Use FlatList for better performance with potentially long lists
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal as RNModal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform, // For KeyboardAvoidingView
  KeyboardAvoidingView, // To handle keyboard overlap in modal
} from "react-native";
import apiService from "../services/api";

// Helper to format dates consistently (optional, but nice)
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    // Add time component to ensure local date interpretation
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
  const [isEditing, setIsEditing] = useState(false); // Track if adding or editing
  const [currentItem, setCurrentItem] = useState(null); // Item being edited
  const [suggestions, setSuggestions] = useState([]); // <-- New state for suggestions
  const [suggestionsLoading, setSuggestionsLoading] = useState(false); // <-- Loading state for suggestions
  const [suggestionsModalVisible, setSuggestionsModalVisible] = useState(false); // <-- State for suggestions modal
  const [formData, setFormData] = useState({
    itemName: "",
    quantity: "",
    unit: "pieces", // Default unit
    expiryDate: "", // Store as YYYY-MM-DD string if using date picker, otherwise plain string
  });

  // Fetch inventory data
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

  // Load inventory when component mounts
  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadInventory(true);
  };

  // Reset form and close modal
  const closeModal = () => {
    setModalVisible(false);
    setIsEditing(false);
    setCurrentItem(null);
    setFormData({ itemName: "", quantity: "", unit: "pieces", expiryDate: "" });
  };

  // Open modal for adding a new item
  const handleAddItem = () => {
    setIsEditing(false);
    setCurrentItem(null);
    setFormData({ itemName: "", quantity: "", unit: "pieces", expiryDate: "" });
    setModalVisible(true);
  };

  // Open modal for editing an existing item
  const handleEditItem = (item) => {
    setIsEditing(true);
    setCurrentItem(item);
    setFormData({
      itemName: item.itemName || "",
      quantity: item.quantity?.toString() || "",
      unit: item.unit || "pieces",
      expiryDate: item.expiryDate || "", // Assumes stored as YYYY-MM-DD
    });
    setModalVisible(true);
  };

  // Handle saving (add or update)
  const handleSaveItem = async () => {
    if (!formData.itemName || !formData.quantity) {
      Alert.alert("Error", "Item name and quantity are required.");
      return;
    }

    const dataToSend = {
      itemName: formData.itemName,
      quantity: parseFloat(formData.quantity) || 0, // Ensure it's a number
      unit: formData.unit || "pieces",
      // Send expiry date only if it's a valid-looking date string (YYYY-MM-DD)
      expiryDate: /^\d{4}-\d{2}-\d{2}$/.test(formData.expiryDate)
        ? formData.expiryDate
        : null,
      // foodId: currentItem?.foodId || null, // Include if linking food items
    };

    setLoading(true); // Indicate saving process
    try {
      let response;
      if (isEditing && currentItem) {
        // Update existing item
        response = await apiService.updateInventoryItem(
          currentItem.id,
          dataToSend
        );
      } else {
        // Add new item
        response = await apiService.addInventoryItem(dataToSend);
      }

      if (response.success) {
        closeModal();
        loadInventory(); // Refresh list after saving
      } else {
        Alert.alert("Error", response.message || "Failed to save item.");
        setLoading(false); // Stop loading indicator on save failure
      }
    } catch (error) {
      console.error("Save inventory item error:", error);
      Alert.alert("Error", error.message || "Could not save item.");
      setLoading(false); // Stop loading indicator on save error
    }
    // setLoading(false) is handled in loadInventory's finally block upon success
  };

  // Handle deleting an item
  const handleDeleteItem = (itemId) => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true); // Indicate deleting process
          try {
            const response = await apiService.deleteInventoryItem(itemId);
            if (response.success) {
              loadInventory(); // Refresh list after deleting
            } else {
              Alert.alert(
                "Error",
                response.message || "Failed to delete item."
              );
              setLoading(false); // Stop loading on delete failure
            }
          } catch (error) {
            console.error("Delete inventory item error:", error);
            Alert.alert("Error", error.message || "Could not delete item.");
            setLoading(false); // Stop loading on delete error
          }
          // setLoading(false) handled in loadInventory's finally block
        },
      },
    ]);
  };

  // Render individual inventory item
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
        {/* Optionally display linked food name */}
        {/* {item.foodItem && <Text style={styles.itemDetails}>Linked Food: {item.foodItem.name}</Text>} */}
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

  // Render when list is empty
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>🧺</Text>
      <Text style={styles.emptyTitle}>Your inventory is empty.</Text>
      <Text style={styles.emptySubtitle}>Tap '+' to add your first item!</Text>
    </View>
  );

  const fetchMealSuggestions = async () => {
    setSuggestionsLoading(true);
    setSuggestions([]); // Clear previous suggestions
    setSuggestionsModalVisible(true); // Show modal immediately with loading indicator
    try {
      const response = await apiService.getMealSuggestions();
      if (response.success && Array.isArray(response.data)) {
        setSuggestions(response.data);
      } else {
        // Handle specific error messages from Gemini if needed
        setSuggestions([
          {
            mealName: "Info",
            description: response.message || "Could not get suggestions.",
            type: "Info",
          },
        ]);
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

      {/* --- ADDED: Suggest Meals Button --- */}
      {/* Place this button somewhere convenient, e.g., below the header or above the list */}
      <View style={styles.suggestionButtonContainer}>
        <TouchableOpacity
          style={[
            styles.suggestionButton, // Add a new style for the button
            (loading || refreshing || inventoryItems.length === 0) &&
              styles.suggestionButtonDisabled, // Add disabled style
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
        ListEmptyComponent={!loading ? renderEmptyList : null} // Show empty state only when not loading
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
                  } // Allow numbers and decimal
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
              placeholder="YYYY-MM-DD" // Simple text input for now
              value={formData.expiryDate}
              onChangeText={(text) =>
                setFormData({ ...formData, expiryDate: text })
              }
              // Consider using a Date Picker component here for better UX
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
              style={[styles.cancelButton, { marginTop: 15 }]} // <-- Revert back to using styles.cancelButton
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
    paddingTop: Platform.OS === "android" ? 25 : 20, // Adjust top padding for platform
    paddingBottom: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 24, // Smaller title
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
    lineHeight: 30, // Adjust line height for vertical centering
    fontWeight: "bold",
  },
  loadingIndicator: {
    marginTop: 50,
  },
  suggestionButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15, // Add more bottom padding if needed
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  suggestionButton: {
    backgroundColor: "#FF6347", // Tomato Red (or your desired color)
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25, // Make it rounded
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  suggestionButtonDisabled: {
    backgroundColor: "#cccccc", // Gray when disabled
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
    paddingBottom: 80, // Ensure space below last item
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
    flex: 1, // Take up available space
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
    marginLeft: 8, // Space between buttons
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
    flex: 1, // Takes up space if list is short
    justifyContent: "center",
    alignItems: "center",
    marginTop: "30%", // Push down from the top a bit
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
  // --- Modal Styles ---
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
    maxWidth: 400, // Max width on larger screens
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionsModalContent: {
    // Specific style for suggestions modal
    backgroundColor: "white",
    borderRadius: 15,
    padding: 24,
    paddingTop: 20,
    width: "100%",
    maxWidth: 500, // Can be wider
    maxHeight: "70%", // Limit height
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
    gap: 12, // Add gap between columns
  },
  column: {
    flex: 1, // Each column takes half the space
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    //flex: 1,
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
