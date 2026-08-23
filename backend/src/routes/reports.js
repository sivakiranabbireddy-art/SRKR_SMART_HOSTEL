const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getOverview, getSummaryReport, getCompatibilityReport, getFeedbackReport } = require('../controllers/reports.controller');

router.use(authenticate);
router.use(requireRole('ADMIN', 'MANAGEMENT'));

router.get('/overview', getOverview);
router.get('/summary', getSummaryReport);
router.get('/compatibility', getCompatibilityReport);
router.get('/feedback', getFeedbackReport);

module.exports = router;
