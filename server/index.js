require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Attach io to app so controllers can emit
app.set('io', io);

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// Routes
const { analytics, records, doctors, slots, reviews } = require('./routes/index');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/doctors', doctors);
app.use('/api/slots', slots);
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/records', records);
app.use('/api/reviews', reviews);
app.use('/api/analytics', analytics);
app.use('/api/ai', require('./routes/ai'));
app.use('/api/display', require('./routes/display'));

// Development helper routes (only mounted when not in production)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', require('./routes/dev'));
}

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Socket.io logic
require('./controllers/socketController')(io);

// Start server immediately to prevent proxy ECONNREFUSED errors on startup
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// MongoDB connect in the background
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mediqueue')
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = { app, io };
