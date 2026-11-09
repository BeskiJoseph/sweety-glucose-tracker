const doctorService = require('../services/doctor.service');
const { validateReportDateQuery } = require('../validators/reading.validator');

async function getPatients(req, res, next) {
  try {
    const patients = await doctorService.getAssignedPatients(req.user.id);
    return res.status(200).json({
      success: true,
      data: patients
    });
  } catch (error) {
    return next(error);
  }
}

async function getPatientReports(req, res, next) {
  try {
    const date = validateReportDateQuery(req.query.date);
    const reports = await doctorService.getPatientReports(
      req.user.id,
      req.params.patientId,
      date
    );

    return res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPatients,
  getPatientReports
};
