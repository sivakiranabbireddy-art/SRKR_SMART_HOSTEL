const router = require('express').Router();
const {
  register,
  login,
  verifyLoginOtp,
  resendLoginOtp,
  getMe,
  registerValidation,
  loginValidation,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  checkEmailStatus,
  checkStudentId,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.get('/email-status', checkEmailStatus);
router.get('/check-student-id', checkStudentId);

// Registration OTP (Legacy / fallback)
router.post('/register', registerValidation, register);
router.post('/register/send-otp', sendRegistrationOtp);
router.post('/register/verify-otp', verifyRegistrationOtp);
router.post('/register/resend-otp', resendRegistrationOtp);

// Direct aliases
router.post('/send-otp', sendRegistrationOtp);
router.post('/verify-otp', verifyRegistrationOtp);
router.post('/resend-otp', resendRegistrationOtp);

// Login with 2-Step OTP Authentication
router.post('/login', loginValidation, login);
router.post('/login/send-otp', loginValidation, login);
router.post('/login/verify-otp', verifyLoginOtp);
router.post('/login/resend-otp', resendLoginOtp);
router.post('/login-verify', verifyLoginOtp);

router.get('/me', authenticate, getMe);

module.exports = router;
