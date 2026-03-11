import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons"; // <-- Added Vector Icons
import apiService from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
          dataToSend,
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
                response.message || "Failed to delete item.",
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

  const fetchMealSuggestions = async () => {
    setSuggestionsLoading(true);
    setSuggestions([]);
    setSuggestionsModalVisible(true);

    try {
      const currentItemNames = [
        ...new Set(inventoryItems.map((item) => item.itemName)),
      ]
        .sort()
        .join(",");

      const cachedSuggestionsJSON = await AsyncStorage.getItem(
        "cachedMealSuggestions",
      );
      const cachedInventoryString = await AsyncStorage.getItem(
        "cachedInventoryString",
      );
      const cachedSuggestions = cachedSuggestionsJSON
        ? JSON.parse(cachedSuggestionsJSON)
        : null;

      if (cachedInventoryString === currentItemNames && cachedSuggestions) {
        setSuggestions(cachedSuggestions);
      } else {
        const response = await apiService.getMealSuggestions();

        if (
          response.success &&
          Array.isArray(response.data) &&
          response.data.length > 0
        ) {
          if (
            response.data[0]?.type === "Error" ||
            response.data[0]?.type === "Info"
          ) {
            setSuggestions(response.data);
          } else {
            setSuggestions(response.data);
            await AsyncStorage.setItem(
              "cachedMealSuggestions",
              JSON.stringify(response.data),
            );
            await AsyncStorage.setItem(
              "cachedInventoryString",
              currentItemNames,
            );
          }
        } else if (response.data?.length === 0) {
          setSuggestions([]);
        } else {
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

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemIconBox}>
        <Feather name="box" size={20} color="#6B7280" />
      </View>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemName}>{item.itemName}</Text>
        <Text style={styles.itemDetails}>
          {item.quantity} {item.unit || ""} • Exp: {formatDate(item.expiryDate)}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          onPress={() => handleEditItem(item)}
          style={styles.actionIconButton}
        >
          <Feather name="edit-2" size={18} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteItem(item.id)}
          style={styles.actionIconButton}
        >
          <Feather name="trash-2" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Feather
        name="inbox"
        size={48}
        color="#D1D5DB"
        style={{ marginBottom: 16 }}
      />
      <Text style={styles.emptyTitle}>Inventory Empty</Text>
      <Text style={styles.emptySubtitle}>
        Tap the '+' button to start tracking your food items.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <TouchableOpacity onPress={handleAddItem} style={styles.addButton}>
          <Feather name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

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
          <Feather
            name="loader"
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.suggestionButtonText}>Generate Meal Ideas</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      )}

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
            tintColor="#111827"
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

            <Text style={styles.label}>Item Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Apples, Milk"
              placeholderTextColor="#9CA3AF"
              value={formData.itemName}
              onChangeText={(text) =>
                setFormData({ ...formData, itemName: text })
              }
            />

            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 5"
                  placeholderTextColor="#9CA3AF"
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
                  placeholder="e.g., kg, L"
                  placeholderTextColor="#9CA3AF"
                  value={formData.unit}
                  onChangeText={(text) =>
                    setFormData({ ...formData, unit: text })
                  }
                />
              </View>
            </View>

            <Text style={styles.label}>Expiry Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
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
                <Text style={styles.saveButtonText}>Save Item</Text>
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
            <View style={styles.suggestionsHeader}>
              <Text style={styles.modalTitle}>Meal Ideas</Text>
              <TouchableOpacity
                onPress={() => setSuggestionsModalVisible(false)}
              >
                <Feather name="x" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {suggestionsLoading ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#111827" />
                <Text style={{ marginTop: 12, color: "#6B7280" }}>
                  Cooking up ideas...
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {suggestions.length > 0 ? (
                  suggestions.map((suggestion, index) => (
                    <View key={index} style={styles.suggestionItem}>
                      <Text style={styles.suggestionName}>
                        {suggestion.mealName}
                      </Text>
                      <Text style={styles.suggestionType}>
                        {suggestion.type} • {suggestion.estimatedPrepTime}
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
          </View>
        </View>
      </RNModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#F9FAFB",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  addButton: {
    backgroundColor: "#111827", // Sleek dark button
    borderRadius: 20,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestionButtonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: "#F9FAFB",
  },
  suggestionButton: {
    flexDirection: "row",
    backgroundColor: "#111827", // Premium dark button
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  suggestionButtonDisabled: {
    backgroundColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
  suggestionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Lighter modern overlay
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  suggestionsModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: Platform.OS === "android" ? 0 : 20, // adjust based on header usage
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    fontSize: 15,
    color: "#111827",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  column: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B5563",
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  suggestionItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  suggestionType: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 8,
  },
  suggestionDesc: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  suggestionIngredients: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "600",
  },
});
