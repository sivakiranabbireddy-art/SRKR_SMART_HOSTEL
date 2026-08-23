const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const prisma = require('../lib/prisma');
const { createError } = require('../middleware/errorHandler');

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name required'),
  body('studentId').trim().isLength({ min: 1 }).withMessage('Student ID required'),
  body('department').trim().isLength({ min: 1 }).withMessage('Department required'),
  body('year').isInt({ min: 1, max: 6 }).withMessage('Year must be between 1 and 6'),
  body('gender').isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Gender must be MALE, FEMALE, or OTHER'),
  validate,
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required'),
  validate,
];

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Temporary in-memory holding store for pending student registration profiles
const pendingRegistrationStore = new Map();

// Helper to generate cryptographically secure 6-digit numeric OTP
function generateSecureOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function isMockStudentAccount(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return (
    (clean.startsWith('mockstudent') && clean.endsWith('@hostelsync.com')) ||
    clean.includes('.test@') ||
    clean.endsWith('@student.com') ||
    clean.endsWith('@hostelsync.com')
  );
}

function isMockBypassActive(email, studentProfile) {
  const env = process.env.NODE_ENV || 'development';
  const isDevOrTest = env === 'development' || env === 'test';
  const isMockEmail = isMockStudentAccount(email);
  const isMockId = studentProfile?.studentId && /^26B95A\d{4}$/i.test(studentProfile.studentId);
  return isDevOrTest && (isMockEmail || isMockId);
}

/**
 * Send OTP: Validates registration payload, checks duplicates, applies 60s cooldown,
 * generates secure 6-digit OTP, stores hashed OTP with 5-minute expiry, and sends email.
 * For mock student accounts in dev/test: skips email sending and uses fixed test OTP 123456.
 */
const sendRegistrationOtp = async (req, res, next) => {
  try {
    const { email, studentId, firstName, lastName, password, department, year, gender, phone } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!studentId || !studentId.trim()) {
      return res.status(400).json({ error: 'Student ID / Register number is required.', field: 'studentId' });
    }
    if (studentId.trim().length !== 10) {
      return res.status(400).json({ error: 'Register number must be exactly 10 characters (e.g. 26B95A0001).', field: 'studentId' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanStudentId = studentId.trim();

    // Check if account or student ID already exists
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(409).json({
        error: `An account with the email "${cleanEmail}" already exists in the database. Please log in or use a different email.`,
        field: 'email',
      });
    }

    const existingProfile = await prisma.studentProfile.findFirst({
      where: {
        studentId: {
          equals: cleanStudentId,
          mode: 'insensitive',
        },
      },
    });
    if (existingProfile) {
      return res.status(409).json({
        error: `Registration number "${cleanStudentId}" already exists in the database. Please check your register number or log in.`,
        field: 'studentId',
      });
    }

    // Rate limiting: 60-second cooldown on OTP sending (bypassed for mock accounts in dev)
    const isMock = isMockBypassActive(cleanEmail);
    if (!isMock) {
      const existingVerification = await prisma.otpVerification.findUnique({ where: { email: cleanEmail } });
      if (existingVerification && existingVerification.lastSentAt) {
        const elapsedMs = Date.now() - new Date(existingVerification.lastSentAt).getTime();
        if (elapsedMs < 60 * 1000) {
          const waitSec = Math.ceil((60 * 1000 - elapsedMs) / 1000);
          return res.status(429).json({ error: `Please wait ${waitSec}s before requesting another OTP.` });
        }
      }
    }

    // Determine OTP code (fixed 123456 for mock accounts in dev/test, random secure OTP otherwise)
    let otp;
    if (isMock) {
      otp = '123456';
      console.log(`🧪 Mock account detected: ${cleanEmail}`);
      console.log(`🔐 Test OTP: 123456`);
    } else {
      otp = generateSecureOtp();
    }

    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    // Save hashed OTP record to database
    await prisma.otpVerification.upsert({
      where: { email: cleanEmail },
      create: {
        email: cleanEmail,
        otpHash,
        expiresAt,
        attempts: 0,
        isUsed: false,
        lastSentAt: new Date(),
      },
      update: {
        otpHash,
        expiresAt,
        attempts: 0,
        isUsed: false,
        lastSentAt: new Date(),
      },
    });

    // Store pending registration data safely
    pendingRegistrationStore.set(cleanEmail, {
      email: cleanEmail,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      studentId: cleanStudentId,
      department: (department || 'General').trim(),
      year: parseInt(year) || 1,
      gender: gender || 'MALE',
      phone: phone ? phone.trim() : null,
      createdAt: Date.now(),
    });

    // Send email only for real accounts; skip completely for mock accounts
    if (!isMock) {
      const { sendOtpEmail } = require('../services/email.service');
      await sendOtpEmail(cleanEmail, otp, firstName.trim());
    }

    res.json({
      success: true,
      message: 'OTP sent successfully.',
    });
  } catch (error) {
    if (error.code === 'NO_EMAIL_CONFIG' || error.code === 'EMAIL_DELIVERY_FAILED') {
      return res.status(500).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Verify OTP: Validates 6-digit OTP against hashed store, checks expiration & attempts limit,
 * marks OTP as used, and registers user account.
 */
const verifyRegistrationOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const verification = await prisma.otpVerification.findUnique({ where: { email: cleanEmail } });

    if (!verification) {
      return res.status(400).json({ error: 'No OTP request found for this email. Please request a new OTP.' });
    }

    if (verification.isUsed) {
      return res.status(400).json({ error: 'OTP has already been used. Please request a new OTP.' });
    }

    if (verification.attempts >= 5) {
      return res.status(429).json({ error: 'Too many attempts. Please request a new OTP.' });
    }

    if (new Date() > new Date(verification.expiresAt)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Verify hashed OTP (allows test OTP 123456 for mock accounts in dev/test)
    const isMock = isMockBypassActive(cleanEmail);
    const isMatch = (isMock && cleanOtp === '123456') || (await bcrypt.compare(cleanOtp, verification.otpHash));
    if (!isMatch) {
      await prisma.otpVerification.update({
        where: { email: cleanEmail },
        data: { attempts: verification.attempts + 1 },
      });
      const remainingAttempts = 5 - (verification.attempts + 1);
      return res.status(400).json({
        error: remainingAttempts > 0 ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining.` : 'Too many attempts. Please request a new OTP.',
      });
    }

    // Mark OTP as used
    await prisma.otpVerification.update({
      where: { email: cleanEmail },
      data: { isUsed: true },
    });

    // Retrieve pending registration data
    const registrationData = pendingRegistrationStore.get(cleanEmail);
    if (!registrationData) {
      return res.status(400).json({ error: 'Registration session expired. Please fill in the registration form again.' });
    }

    // Clean up temporary store
    pendingRegistrationStore.delete(cleanEmail);

    // Double check email uniqueness in DB
    const existingUser = await prisma.user.findUnique({ where: { email: registrationData.email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(registrationData.password, 12);
    const { getRandomHobbies } = require('../constants/hobbies');

    // Create user and profile in PENDING status awaiting admin approval
    const user = await prisma.user.create({
      data: {
        email: registrationData.email,
        passwordHash,
        role: 'STUDENT',
        approvalStatus: 'PENDING',
        profile: {
          create: {
            firstName: registrationData.firstName,
            lastName: registrationData.lastName,
            studentId: registrationData.studentId,
            department: registrationData.department,
            year: registrationData.year,
            gender: registrationData.gender,
            phone: registrationData.phone,
            profileComplete: true,
          },
        },
      },
      include: { profile: true },
    });

    // Automatically initialize baseline preferences
    await prisma.preference.create({
      data: {
        studentProfileId: user.profile.id,
        sleepTime: '5',
        wakeTime: '5',
        weekendSleepTime: '6',
        weekendWakeTime: '6',
        lifestyleType: 2,
        exerciseHabits: 3,
        hobbies: getRandomHobbies(4),
        studyHoursPerDay: 3,
        studiesInRoom: true,
        studyEnvironment: 3,
        noiseWhileStudy: 3,
        examIntensity: 3,
        cleanlinessLevel: 3,
        organizationLevel: 3,
        bathroomCleanliness: 3,
        garbageDisposal: 3,
        sharedSpaceCleanliness: 3,
        noiseTolerance: 3,
        musicFrequency: 3,
        gamingFrequency: 2,
        callsFrequency: 3,
        mediaFrequency: 3,
        socialLevel: 3,
        preferredInteraction: 3,
        visitorFrequency: 3,
        friendsInRoom: 2,
        socialRoommatePreference: 3,
        privacyImportance: 3,
        personalSpaceNeed: 3,
        sharingComfort: 3,
        visitorComfort: 3,
        boundaryStrictness: 3,
        isComplete: true,
      },
    });

    const token = signToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Email verified and account registered successfully! Your account is awaiting admin approval.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus || 'PENDING',
        rejectionReason: null,
        profile: {
          id: user.profile.id,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          studentId: user.profile.studentId,
          department: user.profile.department,
          year: user.profile.year,
          gender: user.profile.gender,
          profileComplete: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend OTP: Applies 60s cooldown, generates fresh secure OTP, updates hashed record with 5m expiry.
 */
const resendRegistrationOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const pendingData = pendingRegistrationStore.get(cleanEmail);

    if (!pendingData) {
      return res.status(400).json({ error: 'No active registration session found. Please fill in the registration form again.' });
    }

    // Cooldown check: 60 seconds (bypassed for mock accounts in dev)
    const isMock = isMockBypassActive(cleanEmail);
    if (!isMock) {
      const existingVerification = await prisma.otpVerification.findUnique({ where: { email: cleanEmail } });
      if (existingVerification && existingVerification.lastSentAt) {
        const elapsedMs = Date.now() - new Date(existingVerification.lastSentAt).getTime();
        if (elapsedMs < 60 * 1000) {
          const waitSec = Math.ceil((60 * 1000 - elapsedMs) / 1000);
          return res.status(429).json({ error: `Please wait ${waitSec}s before requesting another OTP.` });
        }
      }
    }

    let otp;
    if (isMock) {
      otp = '123456';
      console.log(`🧪 Mock account detected: ${cleanEmail}`);
      console.log(`🔐 Test OTP: 123456`);
    } else {
      otp = generateSecureOtp();
    }

    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.otpVerification.upsert({
      where: { email: cleanEmail },
      create: {
        email: cleanEmail,
        otpHash,
        expiresAt,
        attempts: 0,
        isUsed: false,
        lastSentAt: new Date(),
      },
      update: {
        otpHash,
        expiresAt,
        attempts: 0,
        isUsed: false,
        lastSentAt: new Date(),
      },
    });

    if (!isMock) {
      const { sendOtpEmail } = require('../services/email.service');
      await sendOtpEmail(cleanEmail, otp, pendingData.firstName || 'Student');
    }

    res.json({
      success: true,
      message: 'OTP sent successfully.',
    });
  } catch (error) {
    if (error.code === 'NO_EMAIL_CONFIG' || error.code === 'EMAIL_DELIVERY_FAILED') {
      return res.status(500).json({ error: error.message });
    }
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, studentId, department, year, gender, phone } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const existingProfile = await prisma.studentProfile.findUnique({ where: { studentId } });
    if (existingProfile) {
      return res.status(409).json({ error: 'A student with this ID already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { getRandomHobbies } = require('../constants/hobbies');

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'STUDENT',
        profile: {
          create: {
            firstName,
            lastName,
            studentId,
            department,
            year: parseInt(year),
            gender,
            phone: phone || null,
            profileComplete: true,
          },
        },
      },
      include: { profile: true },
    });

    // Automatically initialize complete baseline preferences so student is immediately matchable
    await prisma.preference.create({
      data: {
        studentProfileId: user.profile.id,
        sleepTime: '5',
        wakeTime: '5',
        weekendSleepTime: '6',
        weekendWakeTime: '6',
        lifestyleType: 2,
        exerciseHabits: 3,
        hobbies: getRandomHobbies(4),
        studyHoursPerDay: 3,
        studiesInRoom: true,
        studyEnvironment: 3,
        noiseWhileStudy: 3,
        examIntensity: 3,
        cleanlinessLevel: 3,
        organizationLevel: 3,
        bathroomCleanliness: 3,
        garbageDisposal: 3,
        sharedSpaceCleanliness: 3,
        noiseTolerance: 3,
        musicFrequency: 3,
        gamingFrequency: 2,
        callsFrequency: 3,
        mediaFrequency: 3,
        socialLevel: 3,
        preferredInteraction: 3,
        visitorFrequency: 3,
        friendsInRoom: 2,
        socialRoommatePreference: 3,
        privacyImportance: 3,
        personalSpaceNeed: 3,
        sharingComfort: 3,
        visitorComfort: 3,
        boundaryStrictness: 3,
        isComplete: true,
      },
    });

    const token = signToken(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: {
          id: user.profile.id,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          studentId: user.profile.studentId,
          department: user.profile.department,
          year: user.profile.year,
          gender: user.profile.gender,
          profileComplete: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        profile: {
          include: {
            preference: true,
            allocations: {
              where: { status: { in: ['PENDING', 'CONFIRMED'] } },
              include: { room: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'No user found with this email address. Please check your credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact hostel management.' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // Determine OTP code (fixed 123456 for mock accounts in dev/test, random secure OTP otherwise)
    const isMock = isMockBypassActive(cleanEmail, user.profile);
    let otp;
    if (isMock) {
      otp = '123456';
      console.log(`🧪 Mock login detected: ${cleanEmail}`);
      console.log(`🔐 Test Login OTP: 123456`);
    } else {
      otp = generateSecureOtp();
    }

    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    // Save hashed OTP record to database
    await prisma.otpVerification.upsert({
      where: { email: cleanEmail },
      create: {
        email: cleanEmail,
        otpHash,
        expiresAt,
        attempts: 0,
        isUsed: false,
        lastSentAt: new Date(),
      },
      update: {
        otpHash,
        expiresAt,
        attempts: 0,
        isUsed: false,
        lastSentAt: new Date(),
      },
    });

    // Send email only for real accounts; skip external email sending for mock accounts
    if (!isMock) {
      const { sendOtpEmail } = require('../services/email.service');
      await sendOtpEmail(cleanEmail, otp, user.profile?.firstName || 'Student');
    }

    res.json({
      step: 'otp',
      email: cleanEmail,
      message: `A 6-digit verification code has been sent to ${cleanEmail}`,
    });
  } catch (error) {
    if (error.code === 'NO_EMAIL_CONFIG' || error.code === 'EMAIL_DELIVERY_FAILED') {
      return res.status(500).json({ error: error.message });
    }
    next(error);
  }
};

const verifyLoginOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit verification code.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        profile: {
          include: {
            preference: true,
            allocations: {
              where: { status: { in: ['PENDING', 'CONFIRMED'] } },
              include: { room: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMock = isMockBypassActive(cleanEmail, user.profile);

    if (isMock && cleanOtp === '123456') {
      console.log(`✅ Mock login OTP accepted for: ${cleanEmail}`);
    } else {
      const verification = await prisma.otpVerification.findUnique({ where: { email: cleanEmail } });

      if (!verification) {
        return res.status(400).json({ error: 'No active OTP verification found. Please request a new OTP.' });
      }

      if (verification.isUsed) {
        return res.status(400).json({ error: 'This verification code has already been used. Please request a new OTP.' });
      }

      if (new Date() > new Date(verification.expiresAt)) {
        return res.status(400).json({ error: 'Verification code has expired. Please request a new OTP.' });
      }

      if (verification.attempts >= 5) {
        return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new OTP.' });
      }

      const isValidOtp = await bcrypt.compare(cleanOtp, verification.otpHash);
      if (!isValidOtp) {
        await prisma.otpVerification.update({
          where: { email: cleanEmail },
          data: { attempts: { increment: 1 } },
        });
        const remainingAttempts = 5 - (verification.attempts + 1);
        return res.status(400).json({
          error: `Incorrect verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Please request a new OTP.'}`,
        });
      }

      // Mark OTP as used
      await prisma.otpVerification.update({
        where: { email: cleanEmail },
        data: { isUsed: true },
      });
    }

    const token = signToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus || 'APPROVED',
        rejectionReason: user.rejectionReason || null,
        profile: user.profile ? {
          id: user.profile.id,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          studentId: user.profile.studentId,
          phone: user.profile.phone,
          department: user.profile.department,
          year: user.profile.year,
          gender: user.profile.gender,
          profileComplete: user.profile.profileComplete,
          preference: user.profile.preference,
          allocations: user.profile.allocations,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

const resendLoginOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'No user found with this email.' });
    }

    const isMock = isMockBypassActive(cleanEmail, user.profile);

    if (!isMock) {
      const existingVerification = await prisma.otpVerification.findUnique({ where: { email: cleanEmail } });
      if (existingVerification && existingVerification.lastSentAt) {
        const elapsedMs = Date.now() - new Date(existingVerification.lastSentAt).getTime();
        if (elapsedMs < 60 * 1000) {
          const waitSec = Math.ceil((60 * 1000 - elapsedMs) / 1000);
          return res.status(429).json({ error: `Please wait ${waitSec}s before requesting another OTP.` });
        }
      }
    }

    let otp;
    if (isMock) {
      otp = '123456';
      console.log(`🧪 Mock resend OTP login: ${cleanEmail}`);
    } else {
      otp = generateSecureOtp();
    }

    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otpVerification.upsert({
      where: { email: cleanEmail },
      create: {
        email: cleanEmail,
        otpHash,
        expiresAt,
        attempts: 0,
        isUsed: false,
        lastSentAt: new Date(),
      },
      update: {
        otpHash,
        expiresAt,
        attempts: 0,
        isUsed: false,
        lastSentAt: new Date(),
      },
    });

    if (!isMock) {
      const { sendOtpEmail } = require('../services/email.service');
      await sendOtpEmail(cleanEmail, otp, user.profile?.firstName || 'Student');
    }

    res.json({
      success: true,
      message: `A new 6-digit verification code has been sent to ${cleanEmail}`,
    });
  } catch (error) {
    if (error.code === 'NO_EMAIL_CONFIG' || error.code === 'EMAIL_DELIVERY_FAILED') {
      return res.status(500).json({ error: error.message });
    }
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: {
          include: {
            preference: true,
            allocations: {
              include: { room: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus || 'APPROVED',
      rejectionReason: user.rejectionReason || null,
      profile: user.profile,
    });
  } catch (error) {
    next(error);
  }
};

const checkEmailStatus = async (req, res, next) => {
  try {
    const { verifyEmailTransporter } = require('../services/email.service');
    const result = await verifyEmailTransporter();
    res.json({
      emailUserConfigured: !!(process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.SMTP_USER),
      emailPasswordConfigured: !!(process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS),
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const checkStudentId = async (req, res, next) => {
  try {
    const studentId = req.query.studentId || req.query.id || req.body?.studentId;
    if (!studentId || !studentId.trim()) {
      return res.status(400).json({ error: 'Registration number is required.' });
    }
    const cleanStudentId = studentId.trim();
    const existing = await prisma.studentProfile.findFirst({
      where: {
        studentId: {
          equals: cleanStudentId,
          mode: 'insensitive',
        },
      },
      select: {
        studentId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (existing) {
      return res.json({
        exists: true,
        message: `Registration number "${cleanStudentId}" already exists in the database.`,
      });
    }

    return res.json({
      exists: false,
      message: `Registration number "${cleanStudentId}" is available.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  verifyLoginOtp,
  resendLoginOtp,
  getMe,
  checkEmailStatus,
  checkStudentId,
  registerValidation,
  loginValidation,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  resendRegistrationOtp,
};
