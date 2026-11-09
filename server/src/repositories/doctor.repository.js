const { query } = require('../config/db');

/**
 * Retrieve list of patients assigned to a specific doctor.
 *
 * @param {string} doctorId - Doctor UUID
 * @returns {Promise<Array<object>>} List of assigned patients
 */
async function getAssignedPatients(doctorId) {
  const sql = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.created_at,
      dpa.created_at AS assigned_at
    FROM doctor_patient_assignments dpa
    JOIN users u ON u.id = dpa.patient_id
    WHERE dpa.doctor_id = $1
    ORDER BY u.name ASC
  `;
  const result = await query(sql, [doctorId]);
  return result.rows;
}

/**
 * Check whether a patient is assigned to a specific doctor.
 *
 * @param {string} doctorId - Doctor UUID
 * @param {string} patientId - Patient UUID
 * @returns {Promise<boolean>} True if assigned, false otherwise
 */
async function isPatientAssignedToDoctor(doctorId, patientId) {
  const sql = `
    SELECT 1
    FROM doctor_patient_assignments
    WHERE doctor_id = $1 AND patient_id = $2
    LIMIT 1
  `;
  const result = await query(sql, [doctorId, patientId]);
  return result.rowCount > 0;
}

module.exports = {
  getAssignedPatients,
  isPatientAssignedToDoctor
};
