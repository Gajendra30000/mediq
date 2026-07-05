const express = require('express');
const router = express.Router();
const displayController = require('../controllers/displayController');

// SSE endpoint — TV board polls this
router.get('/sse/:doctorId', displayController.sse);

// REST fallback for initial load
router.get('/snapshot/:doctorId', displayController.getSnapshot);

// List all available doctors for display board setup
router.get('/doctors', displayController.getDisplayDoctors);

module.exports = router;
