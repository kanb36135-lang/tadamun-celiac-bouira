// API Service for Tadamun Celiac Frontend
// Connects to the Node.js/Express backend

const API_BASE_URL = 'http://localhost:5000/api';
// For production: const API_BASE_URL = 'https://your-backend-url.com/api';

class TadamunAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('tadamun_token');
  }

  // Helper: Make API requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      },
      ...options
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur serveur');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // ================= AUTH =================

  async sendVerificationCode(phone) {
    return this.request('/auth/send-code', {
      method: 'POST',
      body: { phone }
    });
  }

  async verifyCode(phone, code) {
    const data = await this.request('/auth/verify-code', {
      method: 'POST',
      body: { phone, code }
    });

    if (data.token) {
      this.token = data.token;
      localStorage.setItem('tadamun_token', data.token);
      localStorage.setItem('tadamun_user', JSON.stringify(data.user));
    }

    return data;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('tadamun_token');
    localStorage.removeItem('tadamun_user');
  }

  isLoggedIn() {
    return !!this.token;
  }

  getUser() {
    const user = localStorage.getItem('tadamun_user');
    return user ? JSON.parse(user) : null;
  }

  // ================= PATIENTS =================

  async registerPatient(formData) {
    return fetch(`${this.baseURL}/patients/register`, {
      method: 'POST',
      body: formData // FormData for file upload
    }).then(res => res.json());
  }

  async getPatients() {
    return this.request('/patients');
  }

  async getPatient(id) {
    return this.request(`/patients/${id}`);
  }

  // ================= VOLUNTEERS =================

  async registerVolunteer(formData) {
    return fetch(`${this.baseURL}/volunteers/register`, {
      method: 'POST',
      body: formData
    }).then(res => res.json());
  }

  async getVolunteers(commune = null) {
    const query = commune ? `?commune=${encodeURIComponent(commune)}` : '';
    return this.request(`/volunteers${query}`);
  }

  // ================= ORDERS =================

  async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: orderData
    });
  }

  async getOrders(patientId = null) {
    const query = patientId ? `?patientId=${patientId}` : '';
    return this.request(`/orders${query}`);
  }

  // ================= BASKETS =================

  async requestBasket(formData) {
    return fetch(`${this.baseURL}/baskets/request`, {
      method: 'POST',
      body: formData
    }).then(res => res.json());
  }

  async getBaskets() {
    return this.request('/baskets');
  }

  // ================= COUNTER =================

  async getCounter() {
    return this.request('/counter');
  }

  // ================= PICKUP POINTS =================

  async getPickupPoints(commune = null) {
    const query = commune ? `?commune=${encodeURIComponent(commune)}` : '';
    return this.request(`/pickup-points${query}`);
  }
}

// Create global instance
const api = new TadamunAPI();
