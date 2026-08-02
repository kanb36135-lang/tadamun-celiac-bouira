require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Trust proxy for Render
app.set('trust proxy', 1);

// CORS - Autoriser les 2 URLs frontend
app.use(cors({
  origin: [
    'https://tadamun-celiac-bouira-site.onrender.com',
    'https://tadamun-celiac-bouira-frontend.onrender.com',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/baskets', require('./routes/baskets'));
app.use('/api/counter', require('./routes/counter'));
app.use('/api/pickup-points', require('./routes/pickupPoints'));

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
