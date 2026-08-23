const {
  numericalSimilarity,
  timeSimilarity,
  checkHardConstraints,
  calculateCompatibility,
  calculateGroupCompatibility,
  buildCompatibilityMatrix,
  getScore,
} = require('../src/services/compatibility');

// ============================================================
// UTILITY FUNCTION TESTS
// ============================================================

describe('numericalSimilarity', () => {
  test('identical values → 100%', () => {
    expect(numericalSimilarity(3, 3)).toBe(100);
    expect(numericalSimilarity(1, 1)).toBe(100);
    expect(numericalSimilarity(5, 5)).toBe(100);
  });

  test('maximum difference → 0%', () => {
    expect(numericalSimilarity(1, 5)).toBe(0);
    expect(numericalSimilarity(5, 1)).toBe(0);
  });

  test('mid difference → 50%', () => {
    expect(numericalSimilarity(1, 3)).toBe(50);
    expect(numericalSimilarity(3, 5)).toBe(50);
  });

  test('one step difference → 75%', () => {
    expect(numericalSimilarity(2, 3)).toBe(75);
  });
});

// ============================================================
// TIME SIMILARITY TESTS
// ============================================================

describe('timeSimilarity', () => {
  test('identical times → 100%', () => {
    expect(timeSimilarity('23:00', '23:00')).toBe(100);
    expect(timeSimilarity('01:00', '01:00')).toBe(100);
  });

  test('cross-midnight difference handled correctly', () => {
    // 23:00 vs 01:00 → 2 hour difference, not 22 hours
    const score = timeSimilarity('23:00', '01:00', 4);
    // 2 hours out of 4 max → 50%
    expect(score).toBeCloseTo(50, 0);
  });

  test('same side of midnight', () => {
    // 22:00 vs 23:00 → 1 hour difference
    const score = timeSimilarity('22:00', '23:00', 4);
    // 1 hour out of 4 max → 75%
    expect(score).toBeCloseTo(75, 0);
  });

  test('large difference → 0%', () => {
    // 06:00 vs 22:00 → 16 hours, but circular min(16, 8) = 8 hours
    // 8 hours with max 4 → capped at 0
    const score = timeSimilarity('06:00', '22:00', 4);
    expect(score).toBe(0);
  });
});

// ============================================================
// HARD CONSTRAINT TESTS
// ============================================================

describe('checkHardConstraints', () => {
  const basePref = {
    studentProfileId: 'A',
    isSmoker: false,
    requiresNonSmoker: false,
    blockedStudentIds: [],
  };

  test('no conflict → false', () => {
    const result = checkHardConstraints(
      { ...basePref, studentProfileId: 'A' },
      { ...basePref, studentProfileId: 'B' }
    );
    expect(result.conflict).toBe(false);
  });

  test('smoker + non-smoker required → conflict', () => {
    const smoker = { ...basePref, studentProfileId: 'A', isSmoker: true };
    const nonSmokerReq = { ...basePref, studentProfileId: 'B', requiresNonSmoker: true };
    const result = checkHardConstraints(smoker, nonSmokerReq);
    expect(result.conflict).toBe(true);
  });

  test('reversed smoker/non-smoker → also conflict', () => {
    const smoker = { ...basePref, studentProfileId: 'B', isSmoker: true };
    const nonSmokerReq = { ...basePref, studentProfileId: 'A', requiresNonSmoker: true };
    const result = checkHardConstraints(nonSmokerReq, smoker);
    expect(result.conflict).toBe(true);
  });

  test('two smokers → no conflict on smoking', () => {
    const s1 = { ...basePref, studentProfileId: 'A', isSmoker: true };
    const s2 = { ...basePref, studentProfileId: 'B', isSmoker: true };
    const result = checkHardConstraints(s1, s2);
    expect(result.conflict).toBe(false);
  });

  test('blocked student → conflict', () => {
    const blocker = { ...basePref, studentProfileId: 'A', blockedStudentIds: ['B'] };
    const blocked = { ...basePref, studentProfileId: 'B' };
    const result = checkHardConstraints(blocker, blocked);
    expect(result.conflict).toBe(true);
  });

  test('reverse block → conflict', () => {
    const a = { ...basePref, studentProfileId: 'A' };
    const b = { ...basePref, studentProfileId: 'B', blockedStudentIds: ['A'] };
    const result = checkHardConstraints(a, b);
    expect(result.conflict).toBe(true);
  });
});

// ============================================================
// COMPATIBILITY SCORE TESTS
// ============================================================

describe('calculateCompatibility', () => {
  const perfectPref = {
    studentProfileId: 'A',
    // Lifestyle
    sleepTime: '23:00', wakeTime: '07:00', weekendSleepTime: '00:00', weekendWakeTime: '09:00',
    lifestyleType: 3, exerciseHabits: 3,
    // Study
    studyHoursPerDay: 4, studiesInRoom: true, studyEnvironment: 2, noiseWhileStudy: 2, examIntensity: 4,
    // Cleanliness
    cleanlinessLevel: 4, organizationLevel: 4, bathroomCleanliness: 4, garbageDisposal: 4, sharedSpaceCleanliness: 4,
    // Noise
    noiseTolerance: 3, musicFrequency: 2, gamingFrequency: 2, callsFrequency: 2, mediaFrequency: 2,
    // Social
    socialLevel: 3, preferredInteraction: 3, visitorFrequency: 2, friendsInRoom: 2, socialRoommatePreference: 3,
    // Boundary
    privacyImportance: 3, personalSpaceNeed: 3, sharingComfort: 3, visitorComfort: 3, boundaryStrictness: 3,
    // Constraints
    isSmoker: false, requiresNonSmoker: false, blockedStudentIds: [],
  };

  test('identical preferences → ~100% compatibility', () => {
    const result = calculateCompatibility(
      { ...perfectPref, studentProfileId: 'A' },
      { ...perfectPref, studentProfileId: 'B' }
    );
    expect(result.score).toBeCloseTo(100, 0);
    expect(result.hardConflict).toBe(false);
  });

  test('hard conflict → score of -1', () => {
    const smoker = { ...perfectPref, studentProfileId: 'A', isSmoker: true };
    const nonSmokerReq = { ...perfectPref, studentProfileId: 'B', requiresNonSmoker: true };
    const result = calculateCompatibility(smoker, nonSmokerReq);
    expect(result.score).toBe(-1);
    expect(result.hardConflict).toBe(true);
  });

  test('opposite extremes → low compatibility', () => {
    const nightOwl = {
      studentProfileId: 'A',
      sleepTime: '03:00', wakeTime: '12:00', weekendSleepTime: '04:00', weekendWakeTime: '13:00',
      lifestyleType: 1, exerciseHabits: 1,
      studyHoursPerDay: 1, studiesInRoom: false, studyEnvironment: 5, noiseWhileStudy: 5, examIntensity: 1,
      cleanlinessLevel: 1, organizationLevel: 1, bathroomCleanliness: 1, garbageDisposal: 1, sharedSpaceCleanliness: 1,
      noiseTolerance: 5, musicFrequency: 5, gamingFrequency: 5, callsFrequency: 5, mediaFrequency: 5,
      socialLevel: 5, preferredInteraction: 5, visitorFrequency: 5, friendsInRoom: 5, socialRoommatePreference: 5,
      privacyImportance: 1, personalSpaceNeed: 1, sharingComfort: 5, visitorComfort: 5, boundaryStrictness: 1,
      isSmoker: false, requiresNonSmoker: false, blockedStudentIds: [],
    };
    const earlyBird = {
      studentProfileId: 'B',
      sleepTime: '21:00', wakeTime: '05:00', weekendSleepTime: '21:00', weekendWakeTime: '06:00',
      lifestyleType: 5, exerciseHabits: 5,
      studyHoursPerDay: 5, studiesInRoom: true, studyEnvironment: 1, noiseWhileStudy: 1, examIntensity: 5,
      cleanlinessLevel: 5, organizationLevel: 5, bathroomCleanliness: 5, garbageDisposal: 5, sharedSpaceCleanliness: 5,
      noiseTolerance: 1, musicFrequency: 1, gamingFrequency: 1, callsFrequency: 1, mediaFrequency: 1,
      socialLevel: 1, preferredInteraction: 1, visitorFrequency: 1, friendsInRoom: 1, socialRoommatePreference: 1,
      privacyImportance: 5, personalSpaceNeed: 5, sharingComfort: 1, visitorComfort: 1, boundaryStrictness: 5,
      isSmoker: false, requiresNonSmoker: false, blockedStudentIds: [],
    };
    const result = calculateCompatibility(nightOwl, earlyBird);
    expect(result.score).toBeLessThan(35);
    expect(result.hardConflict).toBe(false);
  });

  test('result has breakdown fields', () => {
    const result = calculateCompatibility(
      { ...perfectPref, studentProfileId: 'A' },
      { ...perfectPref, studentProfileId: 'B' }
    );
    expect(result).toHaveProperty('lifestyleScore');
    expect(result).toHaveProperty('studyScore');
    expect(result).toHaveProperty('cleanlinessScore');
    expect(result).toHaveProperty('socialScore');
    expect(result).toHaveProperty('boundaryScore');
    expect(result).toHaveProperty('explanation');
  });

  test('result has explanation strings', () => {
    const result = calculateCompatibility(
      { ...perfectPref, studentProfileId: 'A' },
      { ...perfectPref, studentProfileId: 'B' }
    );
    expect(result.explanation).toHaveProperty('strengths');
    expect(result.explanation).toHaveProperty('differences');
    expect(Array.isArray(result.explanation.strengths)).toBe(true);
  });
});

// ============================================================
// GROUP COMPATIBILITY TESTS
// ============================================================

describe('calculateGroupCompatibility', () => {
  const makePref = (id, sleep, wake, social, isSmoker = false, requiresNonSmoker = false) => ({
    id,
    preference: {
      studentProfileId: id,
      sleepTime: sleep, wakeTime: wake, weekendSleepTime: sleep, weekendWakeTime: wake,
      lifestyleType: 3, exerciseHabits: 3,
      studyHoursPerDay: 3, studiesInRoom: true, studyEnvironment: 3, noiseWhileStudy: 3, examIntensity: 3,
      cleanlinessLevel: 3, organizationLevel: 3, bathroomCleanliness: 3, garbageDisposal: 3, sharedSpaceCleanliness: 3,
      noiseTolerance: 3, musicFrequency: 3, gamingFrequency: 3, callsFrequency: 3, mediaFrequency: 3,
      socialLevel: social, preferredInteraction: social, visitorFrequency: 2, friendsInRoom: 2, socialRoommatePreference: social,
      privacyImportance: 3, personalSpaceNeed: 3, sharingComfort: 3, visitorComfort: 3, boundaryStrictness: 3,
      isSmoker, requiresNonSmoker, blockedStudentIds: [],
    },
  });

  test('group with identical students → high compatibility', () => {
    const students = [
      makePref('A', '23:00', '07:00', 3),
      makePref('B', '23:00', '07:00', 3),
      makePref('C', '23:30', '07:30', 3),
      makePref('D', '22:30', '07:00', 3),
    ];
    const matrix = buildCompatibilityMatrix(students);
    const groupScore = calculateGroupCompatibility(['A', 'B', 'C', 'D'], matrix);
    expect(groupScore).not.toBeNull();
    expect(groupScore).toBeGreaterThan(80);
  });

  test('group with hard conflict → null (invalid)', () => {
    const students = [
      makePref('A', '23:00', '07:00', 3, true, false),   // smoker
      makePref('B', '23:00', '07:00', 3, false, true),   // requires non-smoker
      makePref('C', '23:00', '07:00', 3),
    ];
    const matrix = buildCompatibilityMatrix(students);
    const groupScore = calculateGroupCompatibility(['A', 'B', 'C'], matrix);
    expect(groupScore).toBeNull();
  });

  test('solo student → 100%', () => {
    const students = [makePref('A', '23:00', '07:00', 3)];
    const matrix = buildCompatibilityMatrix(students);
    const groupScore = calculateGroupCompatibility(['A'], matrix);
    expect(groupScore).toBe(100);
  });
});

// ============================================================
// MATRIX BUILDER TESTS
// ============================================================

describe('buildCompatibilityMatrix', () => {
  const basePref = (id) => ({
    id,
    preference: {
      studentProfileId: id,
      sleepTime: '23:00', wakeTime: '07:00', weekendSleepTime: '00:00', weekendWakeTime: '09:00',
      lifestyleType: 3, exerciseHabits: 3,
      studyHoursPerDay: 4, studiesInRoom: true, studyEnvironment: 2, noiseWhileStudy: 2, examIntensity: 4,
      cleanlinessLevel: 4, organizationLevel: 4, bathroomCleanliness: 4, garbageDisposal: 4, sharedSpaceCleanliness: 4,
      noiseTolerance: 3, musicFrequency: 2, gamingFrequency: 2, callsFrequency: 2, mediaFrequency: 2,
      socialLevel: 3, preferredInteraction: 3, visitorFrequency: 2, friendsInRoom: 2, socialRoommatePreference: 3,
      privacyImportance: 3, personalSpaceNeed: 3, sharingComfort: 3, visitorComfort: 3, boundaryStrictness: 3,
      isSmoker: false, requiresNonSmoker: false, blockedStudentIds: [],
    },
  });

  test('N students → N*(N-1)/2 pairs', () => {
    const students = ['A', 'B', 'C', 'D'].map(basePref);
    const matrix = buildCompatibilityMatrix(students);
    expect(matrix.size).toBe(6); // 4*3/2 = 6
  });

  test('getScore retrieves correct value', () => {
    const students = ['A', 'B', 'C'].map(basePref);
    const matrix = buildCompatibilityMatrix(students);
    const ab = getScore(matrix, 'A', 'B');
    const ba = getScore(matrix, 'B', 'A');
    expect(ab).not.toBeNull();
    expect(ab).toBe(ba); // Symmetric
  });
});
