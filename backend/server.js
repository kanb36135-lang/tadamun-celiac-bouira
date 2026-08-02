require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ✅ CORS : seulement les origines actives
const allowedOrigins = [
  'https://tadamun-celiac-bouira-site.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080'
];

app.use(cors({
  origin: function (origin, callback) {
    // Autorise les requêtes sans origin (Postman, mobile) ET les origines listées
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('❌ CORS bloqué pour origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204
}));

// 🔍 Log chaque requête (pour vérifier que CORS passe)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} | Origin: ${req.headers.origin || 'direct/server'}`);
  next();
});

app.use(express.json());
app.set('trust proxy', 1);

// ✅ Health check (pour tester si le serveur répond)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/baskets', require('./routes/baskets'));
app.use('/api/counter', require('./routes/counter'));
app.use('/api/pickup-points', require('./routes/pickupPoints'));

// Gestion erreur CORS explicite
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'CORS blocked', 
      yourOrigin: req.headers.origin,
      allowedOrigins: allowedOrigins 
    });
  }
  next(err);
});

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
});