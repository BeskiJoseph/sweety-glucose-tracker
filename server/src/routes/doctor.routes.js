const express = require('express');
const doctorController = require('../controllers/doctor.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireDoctor } = require('../middleware/doctor.middleware');

const router = express.Router();

// All doctor endpoints strictly require authentication AND doctor role
router.use(requireAuth, requireDoctor);

router.get('/patients', doctorController.getPatients);
router.get('/patients/:patientId/reports', doctorController.getPatientReports);

module.exports = router;
