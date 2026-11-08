const readingService = require('../services/reading.service');
const {
  validateCreateReading,
  validateUpdateReading,
  validatePaginationQuery,
  validateReportDateQuery,
  validateTrendMonthQuery
} = require('../validators/reading.validator');

/**
 * Controller handling glucose readings and report requests.
 */

async function createReading(req, res, next) {
  try {
    const validated = validateCreateReading(req.body);
    const reading = await readingService.createReading({
      userId: req.user.id,
      ...validated
    });

    return res.status(201).json({
      success: true,
      message: 'Reading recorded successfully',
      data: reading
    });
  } catch (error) {
    return next(error);
  }
}

async function getReadings(req, res, next) {
  try {
    const { page, limit, offset } = validatePaginationQuery(req.query);
    const result = await readingService.getReadings({
      userId: req.user.id,
      page,
      limit,
      offset
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    return next(error);
  }
}

async function getReadingById(req, res, next) {
  try {
    const reading = await readingService.getReadingById(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      data: reading
    });
  } catch (error) {
    return next(error);
  }
}

async function updateReading(req, res, next) {
  try {
    const validated = validateUpdateReading(req.body);
    const reading = await readingService.updateReading({
      id: req.params.id,
      userId: req.user.id,
      ...validated
    });

    return res.status(200).json({
      success: true,
      message: 'Reading updated successfully',
      data: reading
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteReading(req, res, next) {
  try {
    await readingService.deleteReading(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Reading deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
}

async function getReports(req, res, next) {
  try {
    const date = validateReportDateQuery(req.query.date);
    const reports = await readingService.getReports({
      userId: req.user.id,
      date
    });

    return res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    return next(error);
  }
}

async function getTrendReport(req, res, next) {
  try {
    const month = validateTrendMonthQuery(req.query.month);
    const trend = await readingService.getTrendReport({
      userId: req.user.id,
      month
    });

    return res.status(200).json({
      success: true,
      data: trend
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createReading,
  getReadings,
  getReadingById,
  updateReading,
  deleteReading,
  getReports,
  getTrendReport
};
