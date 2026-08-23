const prisma = require('../lib/prisma');
const { HOBBIES_DATABASE, getRandomHobbies } = require('../constants/hobbies');

const REQUIRED_FIELDS = [
  'sleepTime', 'wakeTime', 'weekendSleepTime', 'weekendWakeTime',
  'lifestyleType', 'exerciseHabits',
  'studyHoursPerDay', 'studiesInRoom', 'studyEnvironment', 'noiseWhileStudy', 'examIntensity',
  'cleanlinessLevel', 'organizationLevel', 'bathroomCleanliness', 'garbageDisposal', 'sharedSpaceCleanliness',
  'noiseTolerance', 'musicFrequency', 'gamingFrequency', 'callsFrequency', 'mediaFrequency',
  'socialLevel', 'preferredInteraction', 'visitorFrequency', 'friendsInRoom', 'socialRoommatePreference',
  'privacyImportance', 'personalSpaceNeed', 'sharingComfort', 'visitorComfort', 'boundaryStrictness',
];

const sanitizePreferenceData = (body) => {
  const clean = {};
  
  // Strings
  if (body.sleepTime != null && body.sleepTime !== '') clean.sleepTime = String(body.sleepTime);
  if (body.wakeTime != null && body.wakeTime !== '') clean.wakeTime = String(body.wakeTime);
  if (body.weekendSleepTime != null && body.weekendSleepTime !== '') clean.weekendSleepTime = String(body.weekendSleepTime);
  if (body.weekendWakeTime != null && body.weekendWakeTime !== '') clean.weekendWakeTime = String(body.weekendWakeTime);

  // Integers
  const intFields = [
    'lifestyleType', 'exerciseHabits',
    'studyHoursPerDay', 'studyEnvironment', 'noiseWhileStudy', 'examIntensity',
    'cleanlinessLevel', 'organizationLevel', 'bathroomCleanliness', 'garbageDisposal', 'sharedSpaceCleanliness',
    'noiseTolerance', 'musicFrequency', 'gamingFrequency', 'callsFrequency', 'mediaFrequency',
    'socialLevel', 'preferredInteraction', 'visitorFrequency', 'friendsInRoom', 'socialRoommatePreference',
    'privacyImportance', 'personalSpaceNeed', 'sharingComfort', 'visitorComfort', 'boundaryStrictness',
  ];
  for (const field of intFields) {
    if (body[field] != null && body[field] !== '') {
      const parsed = parseInt(body[field], 10);
      if (!isNaN(parsed)) clean[field] = parsed;
    }
  }

  // Booleans
  const boolFields = ['studiesInRoom'];
  for (const field of boolFields) {
    if (body[field] !== undefined && body[field] !== null) {
      clean[field] = Boolean(body[field]);
    }
  }

  // Hobbies array (up to 5)
  if (Array.isArray(body.hobbies)) {
    clean.hobbies = body.hobbies.filter(h => typeof h === 'string' && h.trim()).slice(0, 5);
  } else if (typeof body.hobbies === 'string' && body.hobbies.trim()) {
    try {
      const parsed = JSON.parse(body.hobbies);
      if (Array.isArray(parsed)) clean.hobbies = parsed.slice(0, 5);
    } catch {
      clean.hobbies = body.hobbies.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
    }
  }

  // Blocked student IDs array
  if (Array.isArray(body.blockedStudentIds)) {
    clean.blockedStudentIds = body.blockedStudentIds;
  }

  return clean;
};

function checkCompletion(data) {
  return REQUIRED_FIELDS.every(field => data[field] !== undefined && data[field] !== null && data[field] !== '');
}

const getDeadlineSettings = async () => {
  let settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    settings = await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', questionnaireOpen: true, questionnaireDeadline: null },
      update: {},
    });
  }
  return settings;
};

const getQuestionnaireDeadline = async (req, res, next) => {
  try {
    const settings = await getDeadlineSettings();
    const now = new Date();
    let isExpired = false;
    if (settings.questionnaireDeadline) {
      isExpired = now.getTime() >= new Date(settings.questionnaireDeadline).getTime();
    }
    const isOpen = Boolean(settings.questionnaireOpen && !isExpired);
    const status = isOpen ? 'OPEN' : 'CLOSED';

    res.json({
      deadline: settings.questionnaireDeadline,
      isOpen,
      status,
      serverTime: now.toISOString(),
      questionnaireOpen: settings.questionnaireOpen,
    });
  } catch (error) { next(error); }
};

const getHobbiesPool = async (req, res, next) => {
  try {
    const count = parseInt(req.query.count, 10) || 5;
    const suggested = getRandomHobbies(count);
    res.json({
      allHobbies: HOBBIES_DATABASE,
      suggestedHobbies: suggested,
      totalCount: HOBBIES_DATABASE.length,
    });
  } catch (error) { next(error); }
};

const getMyPreferences = async (req, res, next) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const pref = await prisma.preference.findUnique({
      where: { studentProfileId: profile.id },
    });
    res.json({ preference: pref || null });
  } catch (error) { next(error); }
};

const upsertMyPreferences = async (req, res, next) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Check backend deadline enforcement
    const settings = await getDeadlineSettings();
    const now = new Date();
    const isExpired = settings.questionnaireDeadline ? now.getTime() >= new Date(settings.questionnaireDeadline).getTime() : false;
    const isClosed = !settings.questionnaireOpen || isExpired;

    if (isClosed) {
      return res.status(403).json({ error: 'Questionnaire submission deadline has passed.' });
    }

    const cleanData = sanitizePreferenceData(req.body);
    const isComplete = checkCompletion(cleanData);

    const preference = await prisma.preference.upsert({
      where: { studentProfileId: profile.id },
      create: {
        studentProfileId: profile.id,
        ...cleanData,
        isComplete,
      },
      update: {
        ...cleanData,
        isComplete,
      },
    });

    // Update profile completion status
    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: { profileComplete: isComplete },
    });

    res.json({ preference, isComplete });
  } catch (error) { next(error); }
};

module.exports = {
  getMyPreferences,
  upsertMyPreferences,
  getQuestionnaireDeadline,
  getDeadlineSettings,
  getHobbiesPool,
};
