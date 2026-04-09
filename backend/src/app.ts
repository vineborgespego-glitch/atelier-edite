import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/clients.routes';
import orderRoutes from './routes/orders.routes';
import receiptRoutes from './routes/receipts.routes';
import couponRoutes from './routes/coupons.routes';
import notificationRoutes from './routes/notifications.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Security & Logging
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows assets (PDFs) to be loaded from 3001 to 5173
  frameguard: false, // ALLOWS THE IFRAME (Critical for the preview modal!)
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "frame-src": ["'self'", "blob:", "*"], // Allow blob for the PDF preview
      "object-src": ["'self'", "blob:", "*"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "*"],
    },
  },
}));
app.use(morgan('dev'));

// CORS configuration
const allowedOrigins = [
  'https://atelier.d3tech.com.br',
  'https://atelier-edite.vercel.app',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('railway.app')) {
      callback(null, true);
    } else {
      // For now, in production setup, let's be permissive if it's our known domain
      callback(null, true); 
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));

// Quick fix for preflight OPTIONS requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.header('Origin') || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Root route for Railway Health Check
app.get('/', (_req, res) => {
  res.send('🧶 Atelier Édite API is online!');
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Atelier Édite API', version: '1.0.0' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Global Error Handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Erro interno do servidor', message: err.message });
});

export default app;
