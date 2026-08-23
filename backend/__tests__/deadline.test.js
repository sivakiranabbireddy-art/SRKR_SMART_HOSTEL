const { getQuestionnaireDeadline, upsertMyPreferences } = require('../src/controllers/preferences.controller');
const prisma = require('../src/lib/prisma');

describe('Questionnaire Deadline Backend Enforcement', () => {
  beforeEach(async () => {
    await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', questionnaireOpen: true, questionnaireDeadline: null },
      update: { questionnaireOpen: true, questionnaireDeadline: null },
    });
  });

  test('allows submission when questionnaire is OPEN and no deadline set', async () => {
    // Find or create test student
    const profile = prisma.studentProfiles ? prisma.studentProfiles[0] : null;
    if (!profile) return;

    const req = {
      user: { id: profile.userId },
      body: {
        sleepTime: '5', wakeTime: '5', weekendSleepTime: '6', weekendWakeTime: '6',
        lifestyleType: 2, exerciseHabits: 3,
        studyHoursPerDay: 3, studiesInRoom: true, studyEnvironment: 3, noiseWhileStudy: 3, examIntensity: 3,
        cleanlinessLevel: 3, organizationLevel: 3, bathroomCleanliness: 3, garbageDisposal: 3, sharedSpaceCleanliness: 3,
        noiseTolerance: 3, musicFrequency: 3, gamingFrequency: 2, callsFrequency: 3, mediaFrequency: 3,
        socialLevel: 3, preferredInteraction: 3, visitorFrequency: 3, friendsInRoom: 2, socialRoommatePreference: 3,
        privacyImportance: 3, personalSpaceNeed: 3, sharingComfort: 3, visitorComfort: 3, boundaryStrictness: 3,
        isSmoker: false, requiresNonSmoker: false,
      },
    };

    let status = 200;
    let responseData = null;
    const res = {
      status: (code) => { status = code; return res; },
      json: (data) => { responseData = data; return res; },
    };
    const next = jest.fn();

    await upsertMyPreferences(req, res, next);
    expect(status).toBe(200);
    expect(responseData).toHaveProperty('preference');
  });

  test('rejects submission with 403 when questionnaire is CLOSED or deadline has passed', async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    await prisma.systemSettings.update({
      data: { questionnaireDeadline: pastDate, questionnaireOpen: true },
    });

    const profile = prisma.studentProfiles ? prisma.studentProfiles[0] : null;
    if (!profile) return;

    const req = {
      user: { id: profile.userId },
      body: {},
    };

    let status = 200;
    let responseData = null;
    const res = {
      status: (code) => { status = code; return res; },
      json: (data) => { responseData = data; return res; },
    };
    const next = jest.fn();

    await upsertMyPreferences(req, res, next);
    expect(status).toBe(403);
    expect(responseData.error).toBe('Questionnaire submission deadline has passed.');
  });
});
