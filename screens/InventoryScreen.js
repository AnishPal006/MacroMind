import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import apiService from "../services/api";

export default function InventoryScreen() {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal & Edit State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: "",
    unit: "pieces",
    expiryDate: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // AI State
  const [isGettingSuggestions, setIsGettingSuggestions] = useState(false);
  const cancelAiRef = useRef(false);

  // NEW: Premium Recipe Modal State
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeContent, setRecipeContent] = useState("");

  const fetchInventory = async () => {
    try {
      const response = await apiService.getInventory();
      if (response.success) setInventory(response.data || []);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInventory();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setEditingItemId(null);
    setNewItem({ name: "", quantity: "", unit: "pieces", expiryDate: "" });
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    setEditingItemId(item.id);
    setNewItem({
      name: item.itemName || item.name || item.food?.name || "",
      quantity: item.quantity?.toString() || item.amount?.toString() || "",
      unit: item.unit || "pieces",
      expiryDate: item.expiryDate ? item.expiryDate.split("T")[0] : "",
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    const parsedQty = parseFloat(newItem.quantity);
    if (!newItem.name || isNaN(parsedQty) || parsedQty <= 0) {
      Alert.alert(
        "Missing Details",
        "Please provide a valid item name and quantity.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        itemName: newItem.name,
        name: newItem.name,
        quantity: parsedQty,
        amount: parsedQty,
        unit: newItem.unit,
        expiryDate: newItem.expiryDate || null,
      };

      let res;
      if (editingItemId) {
        res = await apiService.updateInventoryItem(editingItemId, payload);
      } else {
        res = await apiService.addInventoryItem(payload);
      }

      if (res.success) {
        setShowAddModal(false);
        fetchInventory();
      } else {
        Alert.alert("Error", res.message || "Failed to save item.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to discard this from your pantry?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await apiService.deleteInventoryItem(id);
              if (res.success)
                setInventory(inventory.filter((item) => item.id !== id));
            } catch (error) {
              Alert.alert("Error", "Failed to remove item.");
            }
          },
        },
      ],
    );
  };

  // --- AI SUGGESTIONS (NOW WITH PREMIUM MODAL) ---
  const handleGetSuggestions = async () => {
    setIsGettingSuggestions(true);
    cancelAiRef.current = false;

    try {
      const res = await apiService.getMealSuggestions();

      if (!cancelAiRef.current) {
        if (res.success) {
          // 🚨 THE FIX: Set the text and open our beautiful custom modal!
          setRecipeContent(
            res.data.suggestions ||
              "No ideas found. Try adding more ingredients!",
          );
          setShowRecipeModal(true);
        } else {
          Alert.alert("Error", "Could not generate recipes.");
        }
      }
    } catch (error) {
      if (!cancelAiRef.current)
        Alert.alert("Error", "Failed to reach AI Chef.");
    } finally {
      if (!cancelAiRef.current) setIsGettingSuggestions(false);
    }
  };

  const handleCancelAi = () => {
    cancelAiRef.current = true;
    setIsGettingSuggestions(false);
  };

  const renderItem = (item) => {
    let isExpiringSoon = false;
    let expiryText = "No expiry set";

    if (item.expiryDate) {
      const expDate = new Date(item.expiryDate);
      const diffDays = Math.ceil(
        (expDate - new Date()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays < 0) {
        expiryText = "Expired";
        isExpiringSoon = true;
      } else if (diffDays <= 3) {
        expiryText = `Expiring in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
        isExpiringSoon = true;
      } else {
        expiryText = `Exp. ${expDate.toLocaleDateString([], { month: "short", day: "numeric" })}`;
      }
    }

    const displayName =
      item.itemName || item.name || item.food?.name || "Unknown Item";
    const displayQty =
      item.quantity !== undefined ? item.quantity : item.amount || 0;

    return (
      <TouchableOpacity
        key={item.id.toString()}
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => openEditModal(item)}
      >
        <View style={styles.iconCircle}>
          <Feather name="box" size={22} color="#111827" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.itemName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.itemQuantity}>
            {displayQty} {item.unit || "units"}
          </Text>
          <View
            style={[
              styles.expiryBadge,
              isExpiringSoon && styles.expiryBadgeWarning,
            ]}
          >
            <Text
              style={[
                styles.expiryText,
                isExpiringSoon && styles.expiryTextWarning,
              ]}
            >
              {expiryText}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id)}
          >
            <Feather name="trash-2" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Pantry</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#111827"
          />
        }
      >
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={handleGetSuggestions}
        >
          <View style={styles.aiBannerIcon}>
            <Feather name="cpu" size={28} color="#111827" />
          </View>
          <View style={styles.aiBannerTextContainer}>
            <Text style={styles.aiBannerTitle}>AI Chef Recipes</Text>
            <Text style={styles.aiBannerSub}>
              Generate meals from your pantry
            </Text>
          </View>
          <Feather name="chevron-right" size={24} color="#D4EB9B" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Inventory</Text>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#111827"
            style={{ marginTop: 40 }}
          />
        ) : inventory.length === 0 ? (
          <View style={styles.centerContent}>
            <View style={styles.emptyCircle}>
              <Feather name="archive" size={40} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>Pantry is Empty</Text>
            <Text style={styles.emptyText}>
              Track ingredients to prevent food waste.
            </Text>
          </View>
        ) : (
          inventory.map((item) => renderItem(item))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.floatingAddBtn}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#D4EB9B" />
        <Text style={styles.floatingAddText}>Add Item</Text>
      </TouchableOpacity>

      {/* --- ADD / EDIT ITEM MODAL --- */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
          >
            <View style={styles.dragPill} />
            <Text style={styles.modalTitle}>
              {editingItemId ? "Edit Ingredient" : "New Ingredient"}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Food Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Rice, Apples"
                value={newItem.name}
                onChangeText={(text) => setNewItem({ ...newItem, name: text })}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>Amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 500"
                  value={newItem.quantity}
                  onChangeText={(text) =>
                    setNewItem({ ...newItem, quantity: text })
                  }
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.inputLabel}>Unit</Text>
                <TextInput
                  style={styles.input}
                  placeholder="g, ml, pieces"
                  value={newItem.unit}
                  onChangeText={(text) =>
                    setNewItem({ ...newItem, unit: text })
                  }
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Expiry Date (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={newItem.expiryDate}
                onChangeText={(text) =>
                  setNewItem({ ...newItem, expiryDate: text })
                }
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#111827" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingItemId ? "Save Changes" : "Save to Pantry"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* --- AI LOADING MODAL --- */}
      <Modal visible={isGettingSuggestions} transparent animationType="fade">
        <View style={styles.aiOverlay}>
          <View style={styles.aiLoadingCard}>
            <ActivityIndicator size="large" color="#D4EB9B" />
            <Text style={styles.aiLoadingTitle}>Chef is thinking...</Text>
            <Text style={styles.aiLoadingSub}>Analyzing your ingredients</Text>
            <TouchableOpacity
              style={styles.aiCancelBtn}
              onPress={handleCancelAi}
            >
              <Text style={styles.aiCancelText}>Cancel Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🚨 THE NEW PREMIUM RECIPE MODAL 🚨 */}
      <Modal
        visible={showRecipeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecipeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.recipeModalContent}>
            <View style={styles.dragPillDark} />

            <View style={styles.recipeHeaderRow}>
              <View style={styles.aiBannerIcon}>
                <Feather name="cpu" size={24} color="#111827" />
              </View>
              <Text style={styles.recipeModalTitle}>AI Chef Recipes</Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1, marginTop: 10 }}
            >
              {/* This splits the text by double line breaks into beautiful individual cards! */}
              {recipeContent.split("\n\n").map((recipe, index) => {
                if (!recipe.trim()) return null;
                return (
                  <View key={index} style={styles.recipeCard}>
                    <Text style={styles.recipeText}>{recipe.trim()}</Text>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeRecipeBtn}
              onPress={() => setShowRecipeModal(false)}
            >
              <Text style={styles.closeRecipeBtnText}>Close Recipes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAF9" },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingBottom: 10,
    backgroundColor: "#F8FAF9",
  },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#111827" },
  listContainer: { paddingHorizontal: 20, paddingBottom: 160, paddingTop: 10 },

  aiBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#D4EB9B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  aiBannerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#D4EB9B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  aiBannerTextContainer: { flex: 1 },
  aiBannerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  aiBannerSub: { fontSize: 13, fontWeight: "600", color: "#9CA3AF" },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: { flex: 1, justifyContent: "center" },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
    marginBottom: 8,
  },

  expiryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expiryBadgeWarning: { backgroundColor: "#FEF2F2" },
  expiryText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  expiryTextWarning: { color: "#EF4444" },
  cardRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingLeft: 10,
  },
  deleteBtn: { padding: 8 },

  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  emptyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyText: { fontSize: 15, color: "#6B7280" },

  floatingAddBtn: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 110 : 100,
    left: "50%",
    transform: [{ translateX: -70 }],
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: "#D4EB9B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingAddText: {
    color: "#D4EB9B",
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  dragPill: {
    width: 40,
    height: 5,
    backgroundColor: "#D1D5DB",
    borderRadius: 5,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 24,
    textAlign: "center",
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#111827",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginRight: 10,
  },
  cancelBtnText: { color: "#4B5563", fontSize: 16, fontWeight: "700" },
  saveBtn: {
    flex: 1,
    backgroundColor: "#D4EB9B",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginLeft: 10,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: "#111827", fontSize: 16, fontWeight: "800" },

  aiOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  aiLoadingCard: {
    backgroundColor: "#111827",
    padding: 40,
    borderRadius: 32,
    alignItems: "center",
    width: "80%",
    shadowColor: "#D4EB9B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  aiLoadingTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 24,
    marginBottom: 8,
  },
  aiLoadingSub: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 32,
  },
  aiCancelBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  aiCancelText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  // 🚨 NEW RECIPE MODAL STYLES
  recipeModalContent: {
    backgroundColor: "#111827",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    height: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  dragPillDark: {
    width: 40,
    height: 5,
    backgroundColor: "#374151",
    borderRadius: 5,
    alignSelf: "center",
    marginBottom: 20,
  },
  recipeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  recipeModalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginLeft: 16,
  },

  recipeCard: {
    backgroundColor: "#1F2937",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#D4EB9B",
  },
  recipeText: {
    fontSize: 16,
    color: "#D1D5DB",
    lineHeight: 24,
    fontWeight: "500",
  },

  closeRecipeBtn: {
    backgroundColor: "#D4EB9B",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },
  closeRecipeBtnText: { color: "#111827", fontSize: 16, fontWeight: "800" },
});
