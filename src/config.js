require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Default configuration with fallbacks for development
const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'easyforms',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_key_do_not_use_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // Razorpay configuration
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  
  // Email configuration (for future use)
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@easyforms.com',
  },
  
  // File upload configuration (for future use)
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880'), // 5MB
    allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,application/pdf').split(','),
    destination: process.env.UPLOAD_DESTINATION || 'uploads/',
  }
};

// Validate critical configuration
if (config.server.nodeEnv === 'production' && config.jwt.secret === 'dev_secret_key_do_not_use_in_production') {
  console.error('WARNING: Using default JWT secret in production environment!');
  console.error('Please set a secure JWT_SECRET in your environment variables.');
}

if (!config.razorpay.keyId || !config.razorpay.keySecret) {
  console.warn('Razorpay configuration is incomplete. Payment features may not work correctly.');
}

module.exports = config;