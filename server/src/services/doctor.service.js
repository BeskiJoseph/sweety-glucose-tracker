const doctorRepository = require('../repositories/doctor.repository');
const readingService = require('./reading.service');
const AppError = require('../errors/AppError');

/**
 * Retrieve all patients assigned to authenticated doctor.
 *
 * @param {string} doctorId - Doctor UUID
 * @returns {Promise<Array<object>>} List of assigned patients
 */
async function getAssignedPatients(doctorId) {
  return doctorRepository.getAssignedPatients(doctorId);
}

/**
 * Retrieve daily, MTD, and monthly reports for an assigned patient.
 * Strictly verifies doctor-patient assignment in backend.
 *
 * @param {string} doctorId - Doctor UUID
 * @param {string} patientId - Target patient UUID
 * @param {string} date - Report date (YYYY-MM-DD)
 * @returns {Promise<object>} Reports object
 */
async function getPatientReports(doctorId, patientId, date) {
  const isAssigned = await doctorRepository.isPatientAssignedToDoctor(doctorId, patientId);
  if (!isAssigned) {
    throw new AppError("You do not have access to this patient's records.", 403);
  }

  return readingService.getReports({
    userId: patientId,
    date
  });
}

module.exports = {
  getAssignedPatients,
  getPatientReports
};
