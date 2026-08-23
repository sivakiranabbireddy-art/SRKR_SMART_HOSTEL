const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  listStudents, getStudentById, toggleStudentStatus,
  createStudent, bulkCreateStudents,
  listRooms, createRoom, updateRoom, deleteRoom,
  compareStudents,
  runMatching, getMatchingRun, listMatchingRuns, confirmMatchingRun,
  getCompatibilityMatrix,
  getAllocations, moveStudent, confirmAllocation, deleteAllocation,
  listFeedback,
  getDashboardStats,
  getQuestionnaireSettingsAdmin,
  updateQuestionnaireSettingsAdmin,
  listRegistrationRequests,
  getRegistrationRequestById,
  approveRegistrationRequest,
  rejectRegistrationRequest,
} = require('../controllers/admin.controller');

router.use(authenticate);
router.use(requireRole('ADMIN'));

// Registration Requests
router.get('/registration-requests', listRegistrationRequests);
router.get('/registration-requests/:id', getRegistrationRequestById);
router.patch('/registration-requests/:id/approve', approveRegistrationRequest);
router.patch('/registration-requests/:id/reject', rejectRegistrationRequest);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Questionnaire Settings
router.get('/questionnaire-settings', getQuestionnaireSettingsAdmin);
router.put('/questionnaire-settings', updateQuestionnaireSettingsAdmin);

// Students
router.get('/students/compare', compareStudents);
router.get('/students', listStudents);
router.post('/students', createStudent);
router.post('/students/bulk', bulkCreateStudents);
router.get('/students/:id', getStudentById);
router.patch('/students/:id/toggle', toggleStudentStatus);

// Rooms
router.get('/rooms', listRooms);
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);

// Matching
router.post('/matching/run', runMatching);
router.get('/matching/runs', listMatchingRuns);
router.post('/matching/runs/:id/confirm', confirmMatchingRun);
router.get('/matching/:id', getMatchingRun);

// Compatibility
router.get('/compatibility/matrix', getCompatibilityMatrix);

// Allocations
router.get('/allocations', getAllocations);
router.post('/allocations/move', moveStudent);
router.post('/allocations/confirm', confirmAllocation);
router.delete('/allocations/:id', deleteAllocation);

// Feedback
router.get('/feedback', listFeedback);

module.exports = router;
