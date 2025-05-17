require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const config = require('./config');
const authRoutes = require('./routes/auth');
const formRoutes = require('./routes/forms');
const submissionRoutes = require('./routes/submissions');
const subscriptionRoutes = require('./routes/subscriptions');
const userRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats'); // Add this line

const app = express();
const PORT = config.server.port || process.env.PORT || 3000;

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST ||'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', 
  database: process.env.DB_NAME || 'easyforms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Make db available to routes
app.locals.db = pool;

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes); // Add this line

// Public form submission endpoint
app.post('/f/:endpointId', require('./controllers/publicSubmission'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
