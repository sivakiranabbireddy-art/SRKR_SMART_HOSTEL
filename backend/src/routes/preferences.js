const router = require('express').Router();
const { authenticate, requireRole, requireApproved } = require('../middleware/auth');
const { getMyPreferences, upsertMyPreferences, getQuestionnaireDeadline, getHobbiesPool } = require('../controllers/preferences.controller');

router.get('/deadline', authenticate, getQuestionnaireDeadline);
router.get('/hobbies', authenticate, getHobbiesPool);

router.use(authenticate);
router.use(requireRole('STUDENT'));
router.use(requireApproved);

router.get('/me', getMyPreferences);
router.put('/me', upsertMyPreferences);

module.exports = router;

