const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const connectDB = require('./config/db');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const entryRoutes = require('./routes/entryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const toPayRoutes = require('./routes/toPayRoutes');
const forSelfRoutes = require('./routes/forSelfRoutes');
const profileRoutes = require('./routes/profileRoutes');
const { resolveAuthUser } = require('./middleware/authMiddleware');

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow frontend PWA
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(resolveAuthUser);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    message: 'MoneyFlow API is running',
    emailConfig: {
      hasBrevoApiKey: !!process.env.BREVO_API_KEY,
      hasSmtpUser: !!process.env.SMTP_USER,
      hasSmtpPass: !!process.env.SMTP_PASS,
      hasResendApiKey: !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder',
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/to-pay', toPayRoutes);
app.use('/api/for-self', forSelfRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);

// Serve Frontend in production
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(
    express.static(frontendDist, {
      setHeaders: (res, filePath) => {
        // Ensure Service Worker, index.html, and manifest are never cached by HTTP caches
        if (
          filePath.endsWith('sw.js') ||
          filePath.includes('workbox-') ||
          filePath.endsWith('index.html') ||
          filePath.endsWith('.webmanifest')
        ) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.originalUrl.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

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
