require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const connectMongo = require('connect-mongo');
const MongoStore = connectMongo.default || connectMongo.MongoStore || connectMongo;
const passport = require('./config/passport');
const adminRoutes = require('./routes/admin');

// Vérification des variables d'environnement
console.log('🔑 GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'OK (masqué)' : 'MANQUANT');
console.log('🔑 GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'OK (masqué)' : 'MANQUANT');
console.log('🔑 SESSION_SECRET:', process.env.SESSION_SECRET ? 'OK (masqué)' : 'MANQUANT');
console.log('🔑 JWT_SECRET:', process.env.JWT_SECRET ? 'OK (masqué)' : 'MANQUANT');

const app = express();

// ✅ CORS : Origines autorisées mises à jour (incluant localhost et sites distants)
const allowedOrigins = [
  'https://tadamun-celiac-bouira-site.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:8080'
];

app.use(cors({
  origin: function (origin, callback) {
    // Autorise les requêtes sans origin (Postman, mobile, formulaires directs) ET les origines autorisées
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.onrender.com') || origin.endsWith('.github.io')) {
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

// Parsers pour les données textuelles / JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.set('trust proxy', 1);

// Session configuration avec connect-mongo
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_tadamun_session_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 14 * 24 * 60 * 60,  // 14 jours
    autoRemove: 'native',
    touchAfter: 24 * 3600
  }),
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 14
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Log global des requêtes entrantes pour le débogage
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} | Origin: ${req.headers.origin || 'direct/server'}`);
  next();
});

// Route de santé (Healthcheck)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Enregistrement des routes de l'API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', adminRoutes);
app.use('/api/patients', require('./routes/patients'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/users', require('./routes/users'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/baskets', require('./routes/baskets'));
app.use('/api/counter', require('./routes/counter'));
app.use('/api/pickup-points', require('./routes/pickupPoints'));

// Middleware de gestion explicite des erreurs CORS
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

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Cors Origins configurées`);
});