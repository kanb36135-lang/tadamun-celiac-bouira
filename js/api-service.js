require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const connectMongo = require('connect-mongo');
const MongoStore = connectMongo.default || connectMongo.MongoStore || connectMongo;
const passport = require('./config/passport');

// Vérification des variables d'environnement au démarrage
console.log('🔑 GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'OK (masqué)' : 'MANQUANT');
console.log('🔑 GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'OK (masqué)' : 'MANQUANT');
console.log('🔑 SESSION_SECRET:', process.env.SESSION_SECRET ? 'OK (masqué)' : 'MANQUANT');
console.log('🔑 JWT_SECRET:', process.env.JWT_SECRET ? 'OK (masqué)' : 'MANQUANT');

const app = express();

// Confiance dans les proxys (Indispensable pour Render et les cookies HTTPS)
app.set('trust proxy', 1);

// ✅ CORS : Origines autorisées
const allowedOrigins = [
  'https://tadamun-celiac-bouira-site.onrender.com',
  'https://tadamun-celiac-bouira-frontend.onrender.com',
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

// Session configuration avec connect-mongo (stockage persistant)
app.use(session({
  secret: process.env.SESSION_SECRET || 'secretKeyFallback',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 14 * 24 * 60 * 60,  // Sessions valides 14 jours
    autoRemove: 'native',      // Suppression automatique des sessions expirées
    touchAfter: 24 * 3600      // Mise à jour du TTL une fois par jour
  }),
  cookie: { 
    secure: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 14  // 14 jours en millisecondes
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Middleware d'analyse des requêtes JSON et Form Data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📂 Rendre le dossier 'uploads' public pour consulter les fichiers PDF transmis
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🔍 Log de suivi des requêtes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} | Origin: ${req.headers.origin || 'direct/server'}`);
  next();
});

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

// Gestion des erreurs CORS explicites
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