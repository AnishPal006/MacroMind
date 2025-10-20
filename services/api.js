import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

class ApiService {
  constructor() {
    this.token = null;
  }

  async setToken(token) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem("authToken", token);
    } else {
      await AsyncStorage.removeItem("authToken");
    }
  }

  async getToken() {
    if (!this.token) {
      this.token = await AsyncStorage.getItem("authToken");
    }
    return this.token;
  }

  async request(endpoint, options = {}) {
    const token = await this.getToken();
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // Auth endpoints
  async register(userData) {
    const response = await this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    if (response.success && response.data.token) {
      await this.setToken(response.data.token);
    }
    return response;
  }

  async login(email, password) {
    const response = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (response.success && response.data.token) {
      await this.setToken(response.data.token);
    }
    return response;
  }

  async logout() {
    await this.setToken(null);
  }

  async getCurrentUser() {
    return this.request("/auth/me");
  }

  // Food endpoints
  async searchFood(query) {
    return this.request(`/food/search?query=${encodeURIComponent(query)}`);
  }

  async scanFoodByText(foodName, quantityGrams, mealType) {
    return this.request("/food/scan", {
      method: "POST",
      body: JSON.stringify({ foodName, quantityGrams, mealType }),
    });
  }

  async scanFoodByImage(imageUri, mealType, quantityGrams) {
    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "food.jpg",
    });
    formData.append("mealType", mealType);
    formData.append("quantityGrams", quantityGrams.toString());

    const token = await this.getToken();
    const response = await fetch(`${API_URL}/food/scan-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Scan failed");
    }
    return data;
  }

  async manualFoodEntry(foodData) {
    return this.request("/food/manual-entry", {
      method: "POST",
      body: JSON.stringify(foodData),
    });
  }

  // Logs endpoints
  async getDailySummary(date) {
    const query = date ? `?date=${date}` : "";
    return this.request(`/logs/daily${query}`);
  }

  async getWeeklySummary() {
    return this.request("/logs/weekly");
  }

  async removeFoodScan(scanId) {
    return this.request(`/logs/scan/${scanId}`, {
      method: "DELETE",
    });
  }

  // User endpoints
  async getProfile() {
    return this.request("/user/profile");
  }

  async updateProfile(profileData) {
    return this.request("/user/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  async getGoals() {
    return this.request("/user/goals");
  }

  async updateGoals(goalsData) {
    return this.request("/user/goals", {
      method: "PUT",
      body: JSON.stringify(goalsData),
    });
  }
}

export default new ApiService();
