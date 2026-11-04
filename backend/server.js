require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import Routes
const memberRoutes = require('./routes/memberRoutes');
const entryRoutes = require('./routes/entryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const toPayRoutes = require('./routes/toPayRoutes');
const forSelfRoutes = require('./routes/forSelfRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow frontend PWA
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), message: 'MoneyFlow API is running' });
});

// Mount Routes
app.use('/api/members', memberRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/to-pay', toPayRoutes);
app.use('/api/for-self', forSelfRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

// Connect DB then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[MoneyFlow Backend Server running on port ${PORT}]`);
  });
}).catch((err) => {
  console.error('Failed to connect to database', err);
});
