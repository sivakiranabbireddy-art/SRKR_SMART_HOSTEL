const router = require('express').Router();
const { authenticate, requireRole, requireApproved } = require('../middleware/auth');
const {
  getMyProfile, updateMyProfile, getMyMatches, getMyRoom, submitFeedback,
} = require('../controllers/students.controller');

router.use(authenticate);
router.use(requireRole('STUDENT'));
router.use(requireApproved);

router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.put('/me/profile', updateMyProfile);
router.get('/me/matches', getMyMatches);
router.get('/me/room', getMyRoom);
router.post('/me/feedback', submitFeedback);

module.exports = router;
