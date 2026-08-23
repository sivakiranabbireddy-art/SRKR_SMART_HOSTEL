const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getManagementDashboard, getManagementRooms } = require('../controllers/management.controller');
const { listAdmins, createAdmin, toggleAdminStatus, deleteAdmin } = require('../controllers/admin.controller');

router.use(authenticate);
router.use(requireRole('ADMIN', 'MANAGEMENT'));

router.get('/dashboard', getManagementDashboard);
router.get('/rooms', getManagementRooms);

// Admin Management
router.get('/admins', listAdmins);
router.post('/admins', createAdmin);
router.patch('/admins/:id/toggle', toggleAdminStatus);
router.delete('/admins/:id', deleteAdmin);

module.exports = router;
