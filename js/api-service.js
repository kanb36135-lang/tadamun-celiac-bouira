const API_BASE_URL = 'https://tadamun-celiac-bouira-backend.onrender.com/api';

async function apiCall(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (data) options.body = JSON.stringify(data);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erreur serveur');
  return result;
}

// Inscription patient
window.registerPatient = (data) => apiCall('/patients/register', 'POST', data);

// Inscription bénévole
window.registerVolunteer = (data) => apiCall('/volunteers/register', 'POST', data);

// Envoyer code SMS
window.sendVerificationCode = (phone) => apiCall('/auth/send-code', 'POST', { phone });

// Vérifier code SMS
window.verifyCode = (phone, code) => apiCall('/auth/verify-code', 'POST', { phone, code });

// Récupérer points de retrait
window.getPickupPoints = () => apiCall('/pickup-points');

// Récupérer compteur
window.getCounter = () => apiCall('/counter');

// Créer commande
window.createOrder = (data) => apiCall('/orders', 'POST', data);

// Demander panier solidaire
window.requestBasket = (data) => apiCall('/baskets/request', 'POST', data);