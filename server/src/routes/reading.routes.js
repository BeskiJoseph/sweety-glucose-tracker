const express = require('express');
const readingController = require('../controllers/reading.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// All reading endpoints require user authentication
router.use(requireAuth);

router.post('/', readingController.createReading);
router.get('/', readingController.getReadings);
router.get('/:id', readingController.getReadingById);
router.put('/:id', readingController.updateReading);
router.delete('/:id', readingController.deleteReading);

module.exports = router;
