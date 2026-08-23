/**
 * HostelSync Compatibility Engine
 * 
 * Implements a weighted, explainable compatibility scoring system.
 * All scores are deterministic and calculated from actual student preference data.
 * No random values or fake scores.
 */

// ============================================================
// CONFIGURABLE WEIGHTS - change here to affect the whole system
// ============================================================
const MATCHING_WEIGHTS = {
  lifestyle: 0.25,
  study: 0.25,
  cleanliness: 0.20,
  social: 0.15,
  boundaries: 0.15,
};

// Algorithm configuration
const ALGORITHM_CONFIG = {
  compatibilityThreshold: 60,    // Minimum score to be a candidate roommate
  topKCandidates: 15,            // Max candidates per student to consider
  maxOptimizationIterations: 50, // Local optimization iteration limit
  minGroupCompatibility: 50,     // Minimum average score for a group to be valid
};

// ============================================================
// TIME-INDEX → HH:MM MIDPOINT TABLES
// Questionnaire stores sleep/wake times as string index "1"–"10".
// These tables map each index to a representative midpoint time.
// ============================================================
const SLEEP_TIME_MIDPOINTS = {
  '1':  '21:30',  // Before 10:00 PM
  '2':  '22:15',  // 10:00–10:30 PM
  '3':  '22:45',  // 10:30–11:00 PM
  '4':  '23:15',  // 11:00–11:30 PM
  '5':  '23:45',  // 11:30 PM–12:00 AM
  '6':  '00:15',  // 12:00–12:30 AM
  '7':  '00:45',  // 12:30–1:00 AM
  '8':  '01:15',  // 1:00–1:30 AM
  '9':  '01:45',  // 1:30–2:00 AM
  '10': '02:30',  // After 2:00 AM
};

const WAKE_TIME_MIDPOINTS = {
  '1':  '05:00',  // Before 5:30 AM
  '2':  '05:45',  // 5:30–6:00 AM
  '3':  '06:15',  // 6:00–6:30 AM
  '4':  '06:45',  // 6:30–7:00 AM
  '5':  '07:15',  // 7:00–7:30 AM
  '6':  '07:45',  // 7:30–8:00 AM
  '7':  '08:15',  // 8:00–8:30 AM
  '8':  '08:45',  // 8:30–9:00 AM
  '9':  '09:30',  // 9:00–10:00 AM
  '10': '10:30',  // After 10:00 AM
};

/**
 * Resolve a time value to "HH:MM".
 * Accepts either the new string index ("1"–"10") or a legacy "HH:MM" string.
 * Falls back to sensible defaults if the value is missing/unknown.
 */
function resolveTimeString(val, type) {
  if (!val) return type === 'sleep' ? '23:00' : '07:00';
  const s = String(val);
  const map = type === 'sleep' ? SLEEP_TIME_MIDPOINTS : WAKE_TIME_MIDPOINTS;
  // If a direct map entry exists, use it (handles "1"–"10" indices)
  if (map[s]) return map[s];
  // If it already looks like HH:MM, use as-is (legacy format)
  if (/^\d{1,2}:\d{2}$/.test(s)) return s;
  // Unknown — default
  return type === 'sleep' ? '23:00' : '07:00';
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Calculate similarity for numerical preferences (1–5 scale).
 * Returns 0–100.
 */
function numericalSimilarity(a, b, min = 1, max = 5) {
  if (a == null || b == null) return null; // Handle missing data explicitly
  const diff = Math.abs(a - b);
  const maxDiff = max - min;
  if (maxDiff === 0) return 100;
  return 100 - (diff / maxDiff) * 100;
}

/**
 * Calculate time similarity accounting for circular midnight boundary.
 * Accepts "HH:MM" strings. Returns 0–100.
 * 
 * Example: 23:00 vs 01:00 → 2 hour difference, not 22 hours.
 */
function timeSimilarity(timeA, timeB, maxHoursDiff = 4) {
  if (!timeA || !timeB) return null; // Handle missing data explicitly
  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const minsA = toMinutes(timeA);
  const minsB = toMinutes(timeB);
  const diff = Math.abs(minsA - minsB);
  const circularDiff = Math.min(diff, 1440 - diff);
  const maxDiffMins = maxHoursDiff * 60;

  return Math.max(0, 100 - (circularDiff / maxDiffMins) * 100);
}

// ============================================================
// HARD CONSTRAINTS
// ============================================================

/**
 * Check if two students have a hard incompatibility.
 * Returns { conflict: true/false, reason: string | null }
 */
function checkHardConstraints(prefA, prefB) {
  // Mutual block list (keep this as the only hard constraint)
  const aBlocked = prefA.blockedStudentIds || [];
  const bBlocked = prefB.blockedStudentIds || [];

  if (aBlocked.includes(prefB.studentProfileId)) {
    return { conflict: true, reason: 'Student A has blocked Student B.' };
  }
  if (bBlocked.includes(prefA.studentProfileId)) {
    return { conflict: true, reason: 'Student B has blocked Student A.' };
  }

  return { conflict: false, reason: null };
}

// ============================================================
// CATEGORY SCORE FUNCTIONS
// ============================================================

function calculateLifestyleScore(prefA, prefB) {
  const scores = [];

  // Resolve time indices or legacy HH:MM strings before comparison
  scores.push(timeSimilarity(resolveTimeString(prefA.sleepTime, 'sleep'), resolveTimeString(prefB.sleepTime, 'sleep'), 4));
  scores.push(timeSimilarity(resolveTimeString(prefA.wakeTime, 'wake'), resolveTimeString(prefB.wakeTime, 'wake'), 4));
  scores.push(timeSimilarity(resolveTimeString(prefA.weekendSleepTime, 'sleep'), resolveTimeString(prefB.weekendSleepTime, 'sleep'), 5));
  scores.push(timeSimilarity(resolveTimeString(prefA.weekendWakeTime, 'wake'), resolveTimeString(prefB.weekendWakeTime, 'wake'), 5));
  scores.push(numericalSimilarity(prefA.lifestyleType, prefB.lifestyleType));
  scores.push(numericalSimilarity(prefA.exerciseHabits, prefB.exerciseHabits));

  // Hobbies overlap similarity
  if (Array.isArray(prefA.hobbies) && Array.isArray(prefB.hobbies) && (prefA.hobbies.length > 0 || prefB.hobbies.length > 0)) {
    const setA = new Set(prefA.hobbies);
    const common = prefB.hobbies.filter(h => setA.has(h)).length;
    const totalUnique = new Set([...prefA.hobbies, ...prefB.hobbies]).size;
    const hobbySim = totalUnique > 0 ? (common / totalUnique) * 100 : 50;
    scores.push(hobbySim);
  }

  const validScores = scores.filter(s => s !== null);
  if (validScores.length === 0) return 50;
  return validScores.reduce((a, b) => a + b, 0) / validScores.length;
}

function calculateStudyScore(prefA, prefB) {
  const scores = [];

  scores.push(numericalSimilarity(prefA.studyHoursPerDay, prefB.studyHoursPerDay));
  scores.push(numericalSimilarity(prefA.studyEnvironment, prefB.studyEnvironment));
  scores.push(numericalSimilarity(prefA.noiseWhileStudy, prefB.noiseWhileStudy));
  scores.push(numericalSimilarity(prefA.examIntensity, prefB.examIntensity));

  // Study-in-room compatibility: if both want to study in room, or neither, it's perfect
  if (prefA.studiesInRoom != null && prefB.studiesInRoom != null) {
    scores.push(prefA.studiesInRoom === prefB.studiesInRoom ? 100 : 50);
  }

  const validScores = scores.filter(s => s !== null);
  if (validScores.length === 0) return 50;
  return validScores.reduce((a, b) => a + b, 0) / validScores.length;
}

function calculateCleanlinessScore(prefA, prefB) {
  const scores = [];

  scores.push(numericalSimilarity(prefA.cleanlinessLevel, prefB.cleanlinessLevel));
  scores.push(numericalSimilarity(prefA.organizationLevel, prefB.organizationLevel));
  scores.push(numericalSimilarity(prefA.bathroomCleanliness, prefB.bathroomCleanliness));
  scores.push(numericalSimilarity(prefA.garbageDisposal, prefB.garbageDisposal));
  scores.push(numericalSimilarity(prefA.sharedSpaceCleanliness, prefB.sharedSpaceCleanliness));

  const validScores = scores.filter(s => s !== null);
  if (validScores.length === 0) return 50;
  return validScores.reduce((a, b) => a + b, 0) / validScores.length;
}

function calculateSocialScore(prefA, prefB) {
  const scores = [];

  scores.push(numericalSimilarity(prefA.socialLevel, prefB.socialLevel));
  scores.push(numericalSimilarity(prefA.preferredInteraction, prefB.preferredInteraction));
  scores.push(numericalSimilarity(prefA.visitorFrequency, prefB.visitorFrequency));
  scores.push(numericalSimilarity(prefA.friendsInRoom, prefB.friendsInRoom));
  scores.push(numericalSimilarity(prefA.socialRoommatePreference, prefB.socialRoommatePreference));
  scores.push(numericalSimilarity(prefA.noiseTolerance, prefB.noiseTolerance));
  scores.push(numericalSimilarity(prefA.musicFrequency, prefB.musicFrequency));
  scores.push(numericalSimilarity(prefA.gamingFrequency, prefB.gamingFrequency));
  scores.push(numericalSimilarity(prefA.callsFrequency, prefB.callsFrequency));
  scores.push(numericalSimilarity(prefA.mediaFrequency, prefB.mediaFrequency));

  const validScores = scores.filter(s => s !== null);
  if (validScores.length === 0) return 50;
  return validScores.reduce((a, b) => a + b, 0) / validScores.length;
}

function calculateBoundaryScore(prefA, prefB) {
  const scores = [];

  scores.push(numericalSimilarity(prefA.privacyImportance, prefB.privacyImportance));
  scores.push(numericalSimilarity(prefA.personalSpaceNeed, prefB.personalSpaceNeed));
  scores.push(numericalSimilarity(prefA.sharingComfort, prefB.sharingComfort));
  scores.push(numericalSimilarity(prefA.visitorComfort, prefB.visitorComfort));
  scores.push(numericalSimilarity(prefA.boundaryStrictness, prefB.boundaryStrictness));

  const validScores = scores.filter(s => s !== null);
  if (validScores.length === 0) return 50;
  return validScores.reduce((a, b) => a + b, 0) / validScores.length;
}

// ============================================================
// EXPLAINABILITY
// ============================================================

/**
 * Generate human-readable explanation bullets for a compatibility score.
 */
function generateExplanation(prefA, prefB, categoryScores) {
  const strengths = [];
  const differences = [];

  // Lifestyle — resolve time indices before comparison
  const sleepSim = timeSimilarity(resolveTimeString(prefA.sleepTime, 'sleep'), resolveTimeString(prefB.sleepTime, 'sleep'), 4);
  if (sleepSim >= 80) strengths.push('Similar sleeping schedules');
  else if (sleepSim < 50) differences.push('Different sleeping schedules');

  const wakeSim = timeSimilarity(resolveTimeString(prefA.wakeTime, 'wake'), resolveTimeString(prefB.wakeTime, 'wake'), 4);
  if (wakeSim >= 80) strengths.push('Similar wake-up times');
  else if (wakeSim < 50) differences.push('Different wake-up times');

  // Study
  const studyEnvSim = numericalSimilarity(prefA.studyEnvironment, prefB.studyEnvironment);
  if (studyEnvSim >= 80) strengths.push('Compatible study environments');
  else if (studyEnvSim < 50) differences.push('Different study environment preferences');

  const noiseSim = numericalSimilarity(prefA.noiseWhileStudy, prefB.noiseWhileStudy);
  if (noiseSim >= 80) strengths.push('Similar noise tolerance while studying');
  else if (noiseSim < 50) differences.push('Different noise tolerance while studying');

  // Cleanliness
  if (categoryScores.cleanliness >= 80) strengths.push('Similar cleanliness standards');
  else if (categoryScores.cleanliness < 60) differences.push('Noticeable difference in cleanliness preferences');

  // Social
  const socialSim = numericalSimilarity(prefA.socialLevel, prefB.socialLevel);
  if (socialSim >= 80) strengths.push('Compatible social lifestyles');
  else if (socialSim < 50) differences.push('Moderate difference in social activity level');

  const visitorSim = numericalSimilarity(prefA.visitorFrequency, prefB.visitorFrequency);
  if (visitorSim >= 80) strengths.push('Similar visitor frequency preferences');
  else if (visitorSim < 50) differences.push('Different preferences for having visitors');

  // Boundaries
  if (categoryScores.boundaries >= 80) strengths.push('Similar personal boundary expectations');
  else if (categoryScores.boundaries < 60) differences.push('Different personal boundary preferences');

  return { strengths, differences };
}

// ============================================================
// MAIN COMPATIBILITY CALCULATOR
// ============================================================

/**
 * Calculate full compatibility between two students.
 * Returns { score, breakdown, explanation } or { score: -1, hardConflict: true }
 */
function calculateCompatibility(prefA, prefB) {
  // Check hard constraints first
  const hardCheck = checkHardConstraints(prefA, prefB);
  if (hardCheck.conflict) {
    return {
      score: -1,
      hardConflict: true,
      conflictReason: hardCheck.reason,
      lifestyleScore: null,
      studyScore: null,
      cleanlinessScore: null,
      socialScore: null,
      boundaryScore: null,
      explanation: { strengths: [], differences: [`Hard conflict: ${hardCheck.reason}`] },
    };
  }

  // Calculate category scores
  const lifestyleScore = calculateLifestyleScore(prefA, prefB);
  const studyScore = calculateStudyScore(prefA, prefB);
  const cleanlinessScore = calculateCleanlinessScore(prefA, prefB);
  const socialScore = calculateSocialScore(prefA, prefB);
  const boundaryScore = calculateBoundaryScore(prefA, prefB);

  // Weighted final score
  const finalScore =
    lifestyleScore * MATCHING_WEIGHTS.lifestyle +
    studyScore * MATCHING_WEIGHTS.study +
    cleanlinessScore * MATCHING_WEIGHTS.cleanliness +
    socialScore * MATCHING_WEIGHTS.social +
    boundaryScore * MATCHING_WEIGHTS.boundaries;

  const categoryScores = { cleanliness: cleanlinessScore, boundaries: boundaryScore };
  const explanation = generateExplanation(prefA, prefB, categoryScores);

  return {
    score: Math.round(finalScore * 100) / 100,
    hardConflict: false,
    conflictReason: null,
    lifestyleScore: Math.round(lifestyleScore * 100) / 100,
    studyScore: Math.round(studyScore * 100) / 100,
    cleanlinessScore: Math.round(cleanlinessScore * 100) / 100,
    socialScore: Math.round(socialScore * 100) / 100,
    boundaryScore: Math.round(boundaryScore * 100) / 100,
    explanation,
  };
}

// ============================================================
// COMPATIBILITY MATRIX BUILDER
// ============================================================

/**
 * Build pairwise compatibility matrix for all students.
 * O(N²) but each pair calculated only once.
 * Returns Map: "idA|idB" -> compatibilityResult
 */
function buildCompatibilityMatrix(studentsWithPrefs) {
  const matrix = new Map();

  for (let i = 0; i < studentsWithPrefs.length; i++) {
    for (let j = i + 1; j < studentsWithPrefs.length; j++) {
      const studentA = studentsWithPrefs[i];
      const studentB = studentsWithPrefs[j];

      // Ensure consistent key ordering (smaller id first)
      const [idA, idB] = studentA.id < studentB.id
        ? [studentA.id, studentB.id]
        : [studentB.id, studentA.id];

      const prefA = { ...studentA.preference, studentProfileId: studentA.id };
      const prefB = { ...studentB.preference, studentProfileId: studentB.id };

      const result = calculateCompatibility(prefA, prefB);
      matrix.set(`${idA}|${idB}`, { ...result, studentAId: idA, studentBId: idB });
    }
  }

  return matrix;
}

/**
 * Get compatibility score between two students from matrix.
 * Returns score or null if not found.
 */
function getScore(matrix, idA, idB) {
  const [a, b] = idA < idB ? [idA, idB] : [idB, idA];
  const entry = matrix.get(`${a}|${b}`);
  return entry ? entry.score : null;
}

/**
 * Calculate average group compatibility.
 * Returns null if any pair has a hard conflict (-1).
 */
function calculateGroupCompatibility(studentIds, matrix) {
  let total = 0;
  let pairs = 0;

  for (let i = 0; i < studentIds.length; i++) {
    for (let j = i + 1; j < studentIds.length; j++) {
      const score = getScore(matrix, studentIds[i], studentIds[j]);

      if (score === null || score === -1) return null; // Hard conflict or missing → invalid group
      total += score;
      pairs++;
    }
  }

  if (pairs === 0) return 100; // Solo student
  return Math.round((total / pairs) * 100) / 100;
}

module.exports = {
  MATCHING_WEIGHTS,
  ALGORITHM_CONFIG,
  numericalSimilarity,
  timeSimilarity,
  checkHardConstraints,
  calculateLifestyleScore,
  calculateStudyScore,
  calculateCleanlinessScore,
  calculateSocialScore,
  calculateBoundaryScore,
  calculateCompatibility,
  buildCompatibilityMatrix,
  getScore,
  calculateGroupCompatibility,
  generateExplanation,
};
