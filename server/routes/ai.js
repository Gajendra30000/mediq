const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

// POST /api/ai/suggest-specialty — suggest medical specialty
router.post('/suggest-specialty', aiController.suggestSpecialty);

// POST /api/ai/drug-interactions — check for drug interactions
router.post('/drug-interactions', protect, aiController.checkInteractions);

// POST /api/ai/summarize-reviews — summarize doctor reviews
router.post('/summarize-reviews', aiController.summarizeReviews);

// POST /api/ai/admin-insight — operations insight for hospital dashboard
router.post('/admin-insight', protect, aiController.getAdminInsight);

// POST /api/ai/chat — patient chat assistant
router.post('/chat', protect, aiController.chat);

module.exports = router;
