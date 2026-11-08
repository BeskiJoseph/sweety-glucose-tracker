const express = require('express');
const readingController = require('../controllers/reading.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// All report endpoints require user authentication
router.use(requireAuth);

router.get('/trend', readingController.getTrendReport);
router.get('/', readingController.getReports);

module.exports = router;
