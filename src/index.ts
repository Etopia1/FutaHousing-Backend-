import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import connectDB from './lib/db';
import { seedAdmin } from './scripts/seedAdmin';
import { cleanupStaleIndexes } from './scripts/cleanupIndexes';

// Feature Routes
import authRoutes from './api/auth/routes';
import hostelRoutes from './api/hostels/routes';
import bookingRoutes from './api/bookings/routes';
import verificationRoutes from './api/verification/routes';
import uploadRoutes from './api/upload/routes';
import adminRoutes from './api/admin/routes';
import inspectionRoutes from './api/inspections/routes';
import notificationRoutes from './api/notifications/routes';

// Standardized Financial Routes (spec v2)
import walletRoutes from './routes/wallet.routes';
import escrowRoutes from './routes/escrow.routes';
import paymentRoutes from './routes/payments.routes';

import { createServer } from 'http';
import { initSocket } from './lib/socket';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/notifications', notificationRoutes);

// Financial APIs
app.use('/api/wallet', walletRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/', (_req, res) => {
  res.json({ message: '🏠 FUTA Housing API is running', version: '2.0.0' });
});

server.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  // Connect to MongoDB, clean up old indexes, then seed admin after server is up
  try {
    await connectDB();
    await cleanupStaleIndexes();
    await seedAdmin();

    // Initialize Socket.io and log after everything else is ready
    initSocket(server);
    console.log('📡 Socket.io system initialized and ready');
  } catch (err) {
    console.error('Startup Error:', err);
  }
});
