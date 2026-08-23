const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { runMatchingPipeline } = require('../services/matching');
const { buildCompatibilityMatrix, calculateCompatibility } = require('../services/compatibility');

// ---- STUDENTS ----
const listStudents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', department = '', status = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build preference filter for complete/incomplete status
    const preferenceFilter = status === 'complete'
      ? { preference: { is: { isComplete: true } } }
      : status === 'incomplete'
      ? { preference: { is: { isComplete: false } } }
      : {};

    const where = {
      role: 'STUDENT',
      profile: {
        isNot: null,
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName:  { contains: search, mode: 'insensitive' } },
            { studentId: { contains: search, mode: 'insensitive' } },
            { department: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(department && { department: { equals: department, mode: 'insensitive' } }),
        ...preferenceFilter,
      },
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: {
            include: {
              preference: { select: { isComplete: true, hobbies: true } },
              allocations: {
                where: { status: { in: ['PENDING', 'CONFIRMED'] } },
                include: { room: { select: { number: true } } },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      students: users.map(u => ({
        id: u.id,
        email: u.email,
        isActive: u.isActive,
        createdAt: u.createdAt,
        profile: u.profile,
      })),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) { next(error); }
};

const getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            preference: true,
            allocations: { include: { room: true, matchingRun: true }, orderBy: { createdAt: 'desc' }, take: 5 },
            feedbacks: { orderBy: { createdAt: 'desc' }, take: 3 },
          },
        },
      },
    });

    if (!user) {
      // Try finding by StudentProfile id
      const profile = await prisma.studentProfile.findUnique({
        where: { id },
        include: {
          user: true,
          preference: true,
          allocations: { include: { room: true, matchingRun: true }, orderBy: { createdAt: 'desc' }, take: 5 },
          feedbacks: { orderBy: { createdAt: 'desc' }, take: 3 },
        },
      });
      if (profile && profile.user) {
        user = {
          ...profile.user,
          profile: {
            ...profile,
            user: undefined,
          },
        };
      }
    }

    if (!user || user.role !== 'STUDENT') return res.status(404).json({ error: 'Student not found' });

    // Remove password hash
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) { next(error); }
};

const createStudent = async (req, res, next) => {
  try {
    const { firstName, lastName, email, studentId, department, year, gender, phone, password } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    if (!studentId || !studentId.trim()) {
      return res.status(400).json({ error: 'Register number (Student ID) is required.' });
    }

    const cleanStudentId = studentId.trim().toUpperCase();
    if (cleanStudentId.length !== 10) {
      return res.status(400).json({ error: 'Register number must be exactly 10 characters (e.g. 26B95A0001).' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(409).json({ error: `An account with email "${cleanEmail}" already exists.` });
    }

    // Check duplicate studentId
    const existingProfile = await prisma.studentProfile.findFirst({
      where: {
        studentId: {
          equals: cleanStudentId,
          mode: 'insensitive',
        },
      },
    });
    if (existingProfile) {
      return res.status(409).json({ error: `Register number "${cleanStudentId}" already exists in the database.` });
    }

    const passwordHash = await bcrypt.hash(password || 'Test@123', 10);
    const { getRandomHobbies } = require('../constants/hobbies');

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        role: 'STUDENT',
        approvalStatus: 'APPROVED',
        isActive: true,
        profile: {
          create: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            studentId: cleanStudentId,
            department: (department || 'Computer Science').trim(),
            year: parseInt(year) || 1,
            gender: gender || 'MALE',
            phone: phone ? phone.trim() : null,
            profileComplete: true,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Initialize baseline preferences
    await prisma.preference.create({
      data: {
        studentProfileId: user.profile.id,
        sleepTime: '23:00',
        wakeTime: '7:00',
        weekendSleepTime: '24:00',
        weekendWakeTime: '8:30',
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

    res.status(201).json({
      success: true,
      message: `Student account for ${firstName} ${lastName} (${cleanStudentId}) created successfully.`,
      student: {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        profile: user.profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

const bulkCreateStudents = async (req, res, next) => {
  try {
    const { mode = 'generate', count = 10, year = 1, department = 'Computer Science', gender = 'MALE', students: rawList, defaultPassword = 'Test@123' } = req.body;

    const { getRandomHobbies } = require('../constants/hobbies');
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    let studentsToCreate = [];

    // Fetch existing records to prevent collisions
    const existingUsers = await prisma.user.findMany({ select: { email: true } });
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

    const existingProfiles = await prisma.studentProfile.findMany({ select: { studentId: true } });
    const existingStudentIds = new Set(existingProfiles.map(p => p.studentId.toUpperCase()));

    if (mode === 'list' && Array.isArray(rawList) && rawList.length > 0) {
      // Validate and prepare pasted / list students
      for (let i = 0; i < rawList.length; i++) {
        const item = rawList[i];
        if (!item.firstName || !item.lastName) {
          return res.status(400).json({ error: `Row ${i + 1}: First name and last name are required.` });
        }
        if (!item.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
          return res.status(400).json({ error: `Row ${i + 1}: Valid email required.` });
        }
        const cleanId = (item.studentId || '').trim().toUpperCase();
        if (cleanId.length !== 10) {
          return res.status(400).json({ error: `Row ${i + 1}: Register number "${cleanId}" must be exactly 10 characters.` });
        }
        const cleanEmail = item.email.trim().toLowerCase();

        if (existingEmails.has(cleanEmail)) {
          return res.status(409).json({ error: `Row ${i + 1}: Email "${cleanEmail}" already exists in the database.` });
        }
        if (existingStudentIds.has(cleanId)) {
          return res.status(409).json({ error: `Row ${i + 1}: Register number "${cleanId}" already exists in the database.` });
        }

        existingEmails.add(cleanEmail);
        existingStudentIds.add(cleanId);

        studentsToCreate.push({
          firstName: item.firstName.trim(),
          lastName: item.lastName.trim(),
          email: cleanEmail,
          studentId: cleanId,
          department: (item.department || department || 'Computer Science').trim(),
          year: parseInt(item.year) || parseInt(year) || 1,
          gender: item.gender || gender || 'MALE',
          phone: item.phone ? item.phone.trim() : `98${String(10000000 + i)}`,
        });
      }
    } else {
      // Auto-generate batch of students
      const genCount = Math.min(Math.max(parseInt(count) || 10, 1), 100);
      const yearInt = parseInt(year) || 1;
      const yearPrefixMap = { 1: '26', 2: '25', 3: '24', 4: '23' };
      const prefixYear = yearPrefixMap[yearInt] || '26';
      const basePrefix = `${prefixYear}B95A`;

      const firstNames = [
        "Aarav", "Aditya", "Ajay", "Akash", "Akhil", "Amar", "Amit", "Anil", "Arjun", "Arnav",
        "Ashok", "Avinash", "Bharat", "Chaitanya", "Charan", "Chetan", "Danish", "Darshan", "Deepak", "Dhanush",
        "Dinesh", "Gagan", "Ganesh", "Gautham", "Girish", "Harish", "Harsha", "Hemanth", "Imran", "Jagan",
        "Kalyan", "Karthik", "Kiran", "Krishna", "Lohith", "Madhav", "Mahesh", "Manoj", "Mohan", "Naveen",
        "Nikhil", "Pavan", "Pradeep", "Pranav", "Praveen", "Rahul", "Rajesh", "Rakesh", "Ravi", "Rohit",
        "Sai", "Sandeep", "Sanjay", "Santosh", "Shiva", "Siddharth", "Sohan", "Srinivas", "Surya", "Tarun",
        "Varun", "Venkatesh", "Vijay", "Vikram", "Vinay", "Vishal", "Vivek", "Yash", "Deva", "Dheeraj"
      ];

      const lastNames = [
        "Kumar", "Reddy", "Rao", "Naidu", "Varma", "Sharma", "Patel", "Singh", "Gupta", "Krishna",
        "Chowdary", "Babu", "Raju", "Mishra", "Joshi", "Kapoor", "Agarwal", "Bhat", "Dubey", "Pandey"
      ];

      let numSequence = 1;
      for (let i = 0; i < genCount; i++) {
        const fn = firstNames[i % firstNames.length];
        const ln = lastNames[(i * 3 + 1) % lastNames.length];

        // Find next non-colliding studentId
        let studentId;
        while (true) {
          studentId = `${basePrefix}${String(numSequence).padStart(4, '0')}`;
          if (!existingStudentIds.has(studentId)) {
            existingStudentIds.add(studentId);
            break;
          }
          numSequence++;
        }

        // Generate non-colliding name-based Gmail
        const cleanF = fn.toLowerCase().replace(/\s+/g, '');
        const cleanL = ln.toLowerCase().replace(/\s+/g, '');
        let email = `${cleanF}.${cleanL}@gmail.com`;
        let emailAttempt = 1;
        while (existingEmails.has(email)) {
          email = `${cleanF}.${cleanL}${String(numSequence).padStart(3, '0')}@gmail.com`;
          if (existingEmails.has(email)) {
            email = `${cleanF}.${cleanL}${String(numSequence).padStart(3, '0')}_${emailAttempt}@gmail.com`;
            emailAttempt++;
          }
        }
        existingEmails.add(email);

        studentsToCreate.push({
          firstName: fn,
          lastName: ln,
          email,
          studentId,
          department: department || 'Computer Science',
          year: yearInt,
          gender: gender || 'MALE',
          phone: `98${String(10000000 + i + Math.floor(Math.random() * 899999))}`,
        });
      }
    }

    // Insert all in a transaction
    const createdUsers = await prisma.$transaction(
      studentsToCreate.map(s =>
        prisma.user.create({
          data: {
            email: s.email,
            passwordHash,
            role: 'STUDENT',
            approvalStatus: 'APPROVED',
            isActive: true,
            profile: {
              create: {
                firstName: s.firstName,
                lastName: s.lastName,
                studentId: s.studentId,
                department: s.department,
                year: s.year,
                gender: s.gender,
                phone: s.phone,
                profileComplete: true,
              },
            },
          },
          include: { profile: true },
        })
      )
    );

    // Initialize baseline preferences for each created student
    await prisma.$transaction(
      createdUsers.map(u =>
        prisma.preference.create({
          data: {
            studentProfileId: u.profile.id,
            sleepTime: '23:00',
            wakeTime: '7:00',
            weekendSleepTime: '24:00',
            weekendWakeTime: '8:30',
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
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdUsers.length} student accounts.`,
      count: createdUsers.length,
      students: createdUsers.map(u => ({
        id: u.id,
        email: u.email,
        studentId: u.profile.studentId,
        name: `${u.profile.firstName} ${u.profile.lastName}`,
        department: u.profile.department,
        year: u.profile.year,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const toggleStudentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
    res.json({ id: updated.id, isActive: updated.isActive });
  } catch (error) { next(error); }
};

// ---- ROOMS ----
const listRooms = async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        allocations: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          include: {
            studentProfile: {
              include: {
                user: { select: { email: true } },
                preference: true,
              },
            },
            matchingRun: { select: { id: true, status: true } },
          },
        },
      },
      orderBy: [{ building: 'asc' }, { floor: 'asc' }, { number: 'asc' }],
    });

    const roomsEnriched = rooms.map((room) => {
      const occupiedCount = Math.min(room.capacity, (room.allocations || []).length);
      const availableSpaces = Math.max(0, room.capacity - occupiedCount);
      return { ...room, occupiedCount, availableSpaces };
    });

    res.json({ rooms: roomsEnriched });
  } catch (error) { next(error); }
};

// ---- COMPARE MULTIPLE STUDENTS ----
// GET /admin/students/compare?studentIds=<id1>,<id2>
const compareStudents = async (req, res, next) => {
  try {
    const { studentIds } = req.query;
    if (!studentIds) {
      return res.status(400).json({ error: 'studentIds is required.' });
    }
    const ids = studentIds.split(',').map(id => id.trim()).filter(Boolean);
    if (ids.length < 2 || ids.length > 5) {
      return res.status(400).json({ error: 'Please provide between 2 and 5 student IDs.' });
    }

    const profiles = await prisma.studentProfile.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { email: true } }, preference: true },
    });

    if (profiles.length !== ids.length) {
      return res.status(404).json({ error: `One or more student profiles not found.` });
    }

    // Preserve exact requested student order
    const orderedProfiles = ids
      .map(id => profiles.find(p => p.id === id))
      .filter(Boolean);

    // Strip password hashes from returned user data
    const safe = (p) => {
      const { user, ...rest } = p;
      const { passwordHash, ...safeUser } = user || {};
      return { ...rest, user: safeUser };
    };

    const safeProfiles = orderedProfiles.map(safe);

    // Calculate group compatibility by averaging all valid pairs
    let totalScore = 0;
    let totalLifestyle = 0;
    let totalStudy = 0;
    let totalCleanliness = 0;
    let totalSocial = 0;
    let totalBoundary = 0;
    let pairs = 0;
    let anyHardConflict = false;
    let allDifferences = new Set();
    
    for (let i = 0; i < orderedProfiles.length; i++) {
      for (let j = i + 1; j < orderedProfiles.length; j++) {
        const prefA = orderedProfiles[i].preference;
        const prefB = orderedProfiles[j].preference;
        if (prefA && prefB) {
          const comp = calculateCompatibility(
            { ...prefA, studentProfileId: orderedProfiles[i].id },
            { ...prefB, studentProfileId: orderedProfiles[j].id }
          );
          if (comp.score !== null) {
            totalScore += comp.score;
            totalLifestyle += comp.lifestyleScore || 0;
            totalStudy += comp.studyScore || 0;
            totalCleanliness += comp.cleanlinessScore || 0;
            totalSocial += comp.socialScore || 0;
            totalBoundary += comp.boundaryScore || 0;
            pairs++;
            if (comp.hardConflict) anyHardConflict = true;
            if (comp.explanation && comp.explanation.differences) {
              comp.explanation.differences.forEach(d => allDifferences.add(d));
            }
          }
        }
      }
    }

    let groupCompatibility = null;
    if (pairs > 0) {
      groupCompatibility = {
        score: Math.round(totalScore / pairs),
        lifestyleScore: Math.round(totalLifestyle / pairs),
        studyScore: Math.round(totalStudy / pairs),
        cleanlinessScore: Math.round(totalCleanliness / pairs),
        socialScore: Math.round(totalSocial / pairs),
        boundaryScore: Math.round(totalBoundary / pairs),
        hardConflict: anyHardConflict,
        differences: Array.from(allDifferences)
      };
    }

    res.json({
      students: safeProfiles,
      compatibility: groupCompatibility,
    });
  } catch (error) { next(error); }
};

const getQuestionnaireSettingsAdmin = async (req, res, next) => {
  try {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', questionnaireOpen: true, questionnaireDeadline: null },
        update: {},
      });
    }
    const now = new Date();
    const isExpired = settings.questionnaireDeadline ? now.getTime() >= new Date(settings.questionnaireDeadline).getTime() : false;
    const isOpen = Boolean(settings.questionnaireOpen && !isExpired);

    res.json({
      settings: {
        ...settings,
        status: isOpen ? 'OPEN' : 'CLOSED',
        serverTime: now.toISOString(),
      },
    });
  } catch (error) { next(error); }
};

const updateQuestionnaireSettingsAdmin = async (req, res, next) => {
  try {
    const { questionnaireDeadline, questionnaireOpen } = req.body;

    let deadlineValue = undefined;
    if (questionnaireDeadline !== undefined) {
      deadlineValue = questionnaireDeadline ? new Date(questionnaireDeadline).toISOString() : null;
    }

    const settings = await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        questionnaireDeadline: deadlineValue,
        questionnaireOpen: questionnaireOpen !== undefined ? Boolean(questionnaireOpen) : true,
      },
      update: {
        ...(deadlineValue !== undefined && { questionnaireDeadline: deadlineValue }),
        ...(questionnaireOpen !== undefined && { questionnaireOpen: Boolean(questionnaireOpen) }),
      },
    });

    const now = new Date();
    const isExpired = settings.questionnaireDeadline ? now.getTime() >= new Date(settings.questionnaireDeadline).getTime() : false;
    const isOpen = Boolean(settings.questionnaireOpen && !isExpired);

    res.json({
      settings: {
        ...settings,
        status: isOpen ? 'OPEN' : 'CLOSED',
        serverTime: now.toISOString(),
      },
      message: 'Questionnaire settings updated successfully.',
    });
  } catch (error) { next(error); }
};

const createRoom = async (req, res, next) => {
  try {
    const { number, capacity, gender, floor, building, description } = req.body;
    if (!number || !capacity || !gender) {
      return res.status(400).json({ error: 'Room number, capacity, and gender are required.' });
    }
    const room = await prisma.room.create({
      data: { number, capacity: parseInt(capacity), gender, floor: floor ? parseInt(floor) : null, building, description },
    });
    res.status(201).json({ room });
  } catch (error) { next(error); }
};

const updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { number, capacity, gender, floor, building, description, status } = req.body;
    const room = await prisma.room.update({
      where: { id },
      data: { number, capacity: capacity ? parseInt(capacity) : undefined, gender, floor: floor !== undefined ? parseInt(floor) : undefined, building, description, status },
    });
    res.json({ room });
  } catch (error) { next(error); }
};

const deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Check no active allocations
    const activeAllocs = await prisma.roomAllocation.count({
      where: { roomId: id, status: { in: ['PENDING', 'CONFIRMED'] } },
    });
    if (activeAllocs > 0) {
      return res.status(409).json({ error: 'Cannot delete room with active allocations. Cancel allocations first.' });
    }
    await prisma.room.delete({ where: { id } });
    res.json({ message: 'Room deleted successfully.' });
  } catch (error) { next(error); }
};

// ---- MATCHING ----
const runMatching = async (req, res, next) => {
  try {
    // Check students with complete preferences
    const readyStudents = await prisma.studentProfile.count({
      where: { preference: { isComplete: true } },
    });
    if (readyStudents === 0) {
      return res.status(400).json({ error: 'No students with complete questionnaires found. Students must complete their questionnaires before matching can run.' });
    }

    const availableRooms = await prisma.room.count({ where: { status: 'AVAILABLE' } });
    if (availableRooms === 0) {
      return res.status(400).json({ error: 'No available rooms found. Please create rooms before running matching.' });
    }

    // Create a new MatchingRun
    const run = await prisma.matchingRun.create({
      data: { status: 'RUNNING', algorithmVersion: '1.0.0' },
    });

    // Run pipeline asynchronously - respond immediately with run ID
    runMatchingPipeline(run.id).catch(err => {
      console.error('[Matching] Pipeline error:', err.message);
    });

    res.status(202).json({
      message: 'Matching algorithm started.',
      matchingRunId: run.id,
      run,
    });
  } catch (error) { next(error); }
};

const getMatchingRun = async (req, res, next) => {
  try {
    const { id } = req.params;
    const run = await prisma.matchingRun.findUnique({
      where: { id },
      include: {
        allocations: {
          include: {
            room: true,
            studentProfile: { select: { id: true, firstName: true, lastName: true, studentId: true } },
          },
        },
      },
    });
    if (!run) return res.status(404).json({ error: 'Matching run not found.' });
    res.json({ run });
  } catch (error) { next(error); }
};

const listMatchingRuns = async (req, res, next) => {
  try {
    const runs = await prisma.matchingRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const runsWithConfirmation = await Promise.all(
      runs.map(async (run) => {
        const pendingCount = await prisma.roomAllocation.count({
          where: { matchingRunId: run.id, status: 'PENDING' },
        });
        const confirmedCount = await prisma.roomAllocation.count({
          where: { matchingRunId: run.id, status: 'CONFIRMED' },
        });
        const isConfirmed = confirmedCount > 0 && pendingCount === 0;
        return {
          ...run,
          isConfirmed: isConfirmed || Boolean(run.notes?.includes('confirmed')),
        };
      })
    );

    res.json({ runs: runsWithConfirmation });
  } catch (error) { next(error); }
};

// ---- COMPATIBILITY MATRIX ----
const getCompatibilityMatrix = async (req, res, next) => {
  try {
    const { roomId } = req.query;

    // Fetch rooms with allocated students having completed preferences
    const rooms = await prisma.room.findMany({
      where: roomId ? { id: roomId } : undefined,
      include: {
        allocations: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          include: {
            studentProfile: {
              include: {
                user: { select: { email: true } },
                preference: true,
              },
            },
          },
        },
      },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });

    const matrix = [];
    const studentMap = new Map();

    for (const room of rooms) {
      const roomAllocs = (room.allocations || []).filter(a => a.studentProfile && a.studentProfile.preference);

      // Collect students with their room context
      for (const alloc of roomAllocs) {
        const s = alloc.studentProfile;
        if (!studentMap.has(s.id)) {
          studentMap.set(s.id, {
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            studentId: s.studentId,
            roomId: room.id,
            roomNumber: room.number,
            building: room.building,
            floor: room.floor,
          });
        }
      }

      // ONLY compute compatibility between students in the SAME room
      for (let i = 0; i < roomAllocs.length; i++) {
        for (let j = i + 1; j < roomAllocs.length; j++) {
          const sA = roomAllocs[i].studentProfile;
          const sB = roomAllocs[j].studentProfile;

          if (sA.preference && sB.preference) {
            const comp = calculateCompatibility(
              { ...sA.preference, studentProfileId: sA.id },
              { ...sB.preference, studentProfileId: sB.id }
            );

            matrix.push({
              id: `cs-${sA.id}-${sB.id}`,
              studentAId: sA.id,
              studentBId: sB.id,
              score: comp.score,
              lifestyleScore: comp.lifestyleScore,
              studyScore: comp.studyScore,
              cleanlinessScore: comp.cleanlinessScore,
              socialScore: comp.socialScore,
              boundaryScore: comp.boundaryScore,
              hardConflict: comp.hardConflict || false,
              conflictReason: comp.conflictReason || null,
              roomId: room.id,
              roomNumber: room.number,
              sameRoom: true,
              studentA: { id: sA.id, firstName: sA.firstName, lastName: sA.lastName, studentId: sA.studentId, roomNumber: room.number },
              studentB: { id: sB.id, firstName: sB.firstName, lastName: sB.lastName, studentId: sB.studentId, roomNumber: room.number },
              explanation: comp.explanation,
            });
          }
        }
      }
    }

    res.json({
      matrix,
      students: Array.from(studentMap.values()),
      runStatus: 'COMPLETED',
    });
  } catch (error) { next(error); }
};

// ---- ALLOCATIONS ----
const getAllocations = async (req, res, next) => {
  try {
    const { runId } = req.query;

    const run = runId
      ? await prisma.matchingRun.findUnique({ where: { id: runId } })
      : await prisma.matchingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { createdAt: 'desc' } });

    if (!run) return res.json({ allocations: [], rooms: [], stats: null });

    const rooms = await prisma.room.findMany({
      include: {
        allocations: {
          where: { matchingRunId: run.id },
          include: {
            studentProfile: {
              select: { id: true, firstName: true, lastName: true, studentId: true, department: true, year: true, gender: true },
            },
          },
        },
      },
    });

    // Calculate per-room compatibility dynamically from roommate preferences
    const roomsWithStats = await Promise.all(
      rooms.map(async (room) => {
        const studentIds = (room.allocations || []).map(a => a.studentProfile.id);
        if (studentIds.length < 2) return { ...room, roomCompatibility: null };

        const roomPrefs = await prisma.preference.findMany({
          where: { studentProfileId: { in: studentIds } },
        });

        let pairTotal = 0;
        let pairCount = 0;
        for (let i = 0; i < roomPrefs.length; i++) {
          for (let j = i + 1; j < roomPrefs.length; j++) {
            const comp = calculateCompatibility(
              { ...roomPrefs[i], studentProfileId: roomPrefs[i].studentProfileId },
              { ...roomPrefs[j], studentProfileId: roomPrefs[j].studentProfileId }
            );
            if (comp.score !== null && !comp.hardConflict) {
              pairTotal += comp.score;
              pairCount++;
            }
          }
        }

        const avg = pairCount > 0 ? Math.round(pairTotal / pairCount) : null;
        return { ...room, roomCompatibility: avg };
      })
    );

    res.json({ rooms: roomsWithStats, run });
  } catch (error) { next(error); }
};

const moveStudent = async (req, res, next) => {
  try {
    const { studentProfileId, fromRoomId, toRoomId, matchingRunId } = req.body;

    const targetRoom = await prisma.room.findUnique({ where: { id: toRoomId } });
    if (!targetRoom) {
      return res.status(404).json({ error: 'Target room not found.' });
    }

    // Check target room capacity across all active allocations
    const targetAllocations = await prisma.roomAllocation.count({
      where: { roomId: toRoomId, status: { in: ['PENDING', 'CONFIRMED'] } },
    });

    if (targetAllocations >= targetRoom.capacity) {
      return res.status(409).json({
        error: `Room ${targetRoom.number} is at full capacity (${targetRoom.capacity}/${targetRoom.capacity} beds occupied).`,
      });
    }

    // Update allocation
    await prisma.roomAllocation.updateMany({
      where: {
        studentProfileId,
        roomId: fromRoomId,
        ...(matchingRunId && { matchingRunId }),
      },
      data: { roomId: toRoomId },
    });

    res.json({ message: 'Student moved successfully.' });
  } catch (error) { next(error); }
};

const confirmAllocation = async (req, res, next) => {
  try {
    const { matchingRunId } = req.body;

    await prisma.roomAllocation.updateMany({
      where: { matchingRunId, status: 'PENDING' },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });

    res.json({ message: 'All allocations confirmed successfully.' });
  } catch (error) { next(error); }
};

// ---- FEEDBACK ----
const listFeedback = async (req, res, next) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      include: {
        studentProfile: { select: { firstName: true, lastName: true, studentId: true } },
        roomAllocation: { include: { room: { select: { number: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ feedback: feedbacks, feedbacks });
  } catch (error) { next(error); }
};

// ---- DASHBOARD STATS ----
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalStudents,
      totalRooms,
      studentsWithPrefs,
      activeAllocations,
      latestRun,
      feedbackStats,
    ] = await Promise.all([
      prisma.studentProfile.count(),
      prisma.room.count(),
      prisma.preference.count({ where: { isComplete: true } }),
      prisma.roomAllocation.count({ where: { status: { in: ['PENDING', 'CONFIRMED'] } } }),
      prisma.matchingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { createdAt: 'desc' } }),
      prisma.feedback.aggregate({ _avg: { overallSatisfaction: true }, _count: true }),
    ]);

    res.json({
      totalStudents,
      totalRooms,
      studentsWithPrefs,
      activeAllocations,
      studentsUnassigned: totalStudents - activeAllocations,
      latestRun,
      avgSatisfaction: feedbackStats._avg.overallSatisfaction,
      totalFeedback: feedbackStats._count,
    });
  } catch (error) { next(error); }
};

const deleteAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.roomAllocation.delete({ where: { id } });
    res.json({ message: 'Allocation deleted successfully.' });
  } catch (error) { next(error); }
};

const confirmMatchingRun = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.roomAllocation.updateMany({
      where: { matchingRunId: id, status: 'PENDING' },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
    await prisma.matchingRun.update({
      where: { id },
      data: { notes: 'Allocations confirmed by administrator' },
    });
    res.json({ message: 'Matching run allocations confirmed successfully.' });
  } catch (error) { next(error); }
};

// ---- ADMIN & MANAGEMENT ACCOUNTS ----
const listAdmins = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGEMENT'] } },
      orderBy: { createdAt: 'asc' },
    });
    const safeAdmins = users.map(u => {
      const { passwordHash, ...rest } = u;
      return rest;
    });
    res.json({ admins: safeAdmins });
  } catch (error) { next(error); }
};

const createAdmin = async (req, res, next) => {
  try {
    const { email, password, role = 'ADMIN' } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    const cleanRole = role.toUpperCase() === 'MANAGEMENT' ? 'MANAGEMENT' : 'ADMIN';

    const existingUser = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newAdmin = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        role: cleanRole,
        isActive: true,
      },
    });

    res.status(201).json({
      message: `${cleanRole === 'ADMIN' ? 'Administrator' : 'Management'} account created successfully.`,
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        role: newAdmin.role,
        isActive: newAdmin.isActive,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (error) { next(error); }
};

const toggleAdminStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.id === id) {
      return res.status(400).json({ error: 'You cannot deactivate your own administrator account.' });
    }

    const admin = await prisma.user.findUnique({ where: { id } });
    if (!admin || !['ADMIN', 'MANAGEMENT'].includes(admin.role)) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !admin.isActive },
    });

    res.json({ id: updated.id, isActive: updated.isActive, message: `Admin status set to ${updated.isActive ? 'Active' : 'Inactive'}.` });
  } catch (error) { next(error); }
};

const deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own administrator account.' });
    }

    const admin = await prisma.user.findUnique({ where: { id } });
    if (!admin || !['ADMIN', 'MANAGEMENT'].includes(admin.role)) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Administrator account removed successfully.' });
  } catch (error) { next(error); }
};

// ---- REGISTRATION REQUESTS ----
const listRegistrationRequests = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const where = { role: 'STUDENT' };

    if (status && status !== 'ALL') {
      where.approvalStatus = status;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        profile: {
          include: {
            preference: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let filtered = users;
    if (search) {
      const q = search.toLowerCase();
      filtered = users.filter(u =>
        u.email?.toLowerCase().includes(q) ||
        u.profile?.firstName?.toLowerCase().includes(q) ||
        u.profile?.lastName?.toLowerCase().includes(q) ||
        u.profile?.studentId?.toLowerCase().includes(q) ||
        u.profile?.department?.toLowerCase().includes(q)
      );
    }

    const counts = {
      total: users.length,
      pending: users.filter(u => (u.approvalStatus || 'APPROVED') === 'PENDING').length,
      approved: users.filter(u => (u.approvalStatus || 'APPROVED') === 'APPROVED').length,
      rejected: users.filter(u => (u.approvalStatus || 'APPROVED') === 'REJECTED').length,
    };

    res.json({
      requests: filtered.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        approvalStatus: u.approvalStatus || 'APPROVED',
        rejectionReason: u.rejectionReason || null,
        isActive: u.isActive,
        createdAt: u.createdAt,
        profile: u.profile,
      })),
      counts,
    });
  } catch (error) { next(error); }
};

const getRegistrationRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            preference: true,
          },
        },
      },
    });

    if (!user || user.role !== 'STUDENT') {
      return res.status(404).json({ error: 'Student registration request not found.' });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus || 'APPROVED',
      rejectionReason: user.rejectionReason || null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      profile: user.profile,
    });
  } catch (error) { next(error); }
};

const approveRegistrationRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user || user.role !== 'STUDENT') {
      return res.status(404).json({ error: 'Student registration request not found.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        rejectionReason: null,
      },
      include: { profile: true },
    });

    // Send approval notification email
    const { sendApprovalEmail } = require('../services/email.service');
    sendApprovalEmail(updated.email, updated.profile?.firstName || 'Student').catch(err => {
      console.error('[Admin] Failed to send approval email:', err.message);
    });

    res.json({
      success: true,
      message: `Registration for ${updated.profile?.firstName || updated.email} has been approved.`,
      user: {
        id: updated.id,
        email: updated.email,
        approvalStatus: updated.approvalStatus,
      },
    });
  } catch (error) { next(error); }
};

const rejectRegistrationRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user || user.role !== 'STUDENT') {
      return res.status(404).json({ error: 'Student registration request not found.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        rejectionReason: reason ? reason.trim() : 'Registration rejected by administrator.',
      },
      include: { profile: true },
    });

    // Send rejection notification email
    const { sendRejectionEmail } = require('../services/email.service');
    sendRejectionEmail(updated.email, updated.profile?.firstName || 'Student', updated.rejectionReason).catch(err => {
      console.error('[Admin] Failed to send rejection email:', err.message);
    });

    res.json({
      success: true,
      message: `Registration for ${updated.profile?.firstName || updated.email} has been rejected.`,
      user: {
        id: updated.id,
        email: updated.email,
        approvalStatus: updated.approvalStatus,
        rejectionReason: updated.rejectionReason,
      },
    });
  } catch (error) { next(error); }
};

module.exports = {
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
  listAdmins, createAdmin, toggleAdminStatus, deleteAdmin,
  listRegistrationRequests,
  getRegistrationRequestById,
  approveRegistrationRequest,
  rejectRegistrationRequest,
};

