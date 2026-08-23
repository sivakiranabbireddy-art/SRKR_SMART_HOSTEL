/**
 * HostelSync Room Matching Algorithm
 *
 * Phase 1: O(N²) pairwise compatibility (done by compatibility.js)
 * Phase 2: Top-K candidate generation per student
 * Phase 3: Greedy group formation and room allocation with strict capacity enforcement
 * Phase 4: Local optimization via student swaps with hard capacity constraints
 */

const prisma = require('../lib/prisma');
const {
  buildCompatibilityMatrix,
  calculateGroupCompatibility,
  getScore,
  calculateCompatibility,
  ALGORITHM_CONFIG,
} = require('./compatibility');

// ============================================================
// PHASE 2: Top-K Candidate Generation
// ============================================================

/**
 * For each student, find their top-K compatible candidates above threshold.
 * Returns Map: studentId -> [{ studentId, score }] sorted descending
 */
function buildTopKCandidates(studentIds, matrix, k = ALGORITHM_CONFIG.topKCandidates, threshold = ALGORITHM_CONFIG.compatibilityThreshold) {
  const topK = new Map();

  for (const idA of studentIds) {
    const candidates = [];
    for (const idB of studentIds) {
      if (idA === idB) continue;
      const score = getScore(matrix, idA, idB);
      if (score !== null && score >= threshold) {
        candidates.push({ studentId: idB, score });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    topK.set(idA, candidates.slice(0, k));
  }

  return topK;
}

// ============================================================
// ROOM ORDER & PRIORITY HELPERS
// ============================================================

/**
 * Room priority comparator:
 * 1. Floor priority: Lower floor first (1st floor → 2nd floor → 3rd floor → 4th floor → 5th floor → ...)
 * 2. Room number numeric/alphabetical priority within the same floor (e.g. Room 5, Room 6, Room 8, Room 10)
 */
function compareRoomsByPriority(a, b) {
  // 1. Floor priority ascending (1st floor -> 2nd floor -> 3rd floor -> higher)
  const floorA = a.floor != null ? Number(a.floor) : Number.MAX_SAFE_INTEGER;
  const floorB = b.floor != null ? Number(b.floor) : Number.MAX_SAFE_INTEGER;
  if (floorA !== floorB) {
    return floorA - floorB;
  }

  // 2. Room number numeric extraction if possible (e.g. "Room 5" -> 5, "Room 10" -> 10, "A-101" -> 101)
  const numA = parseInt(String(a.number).replace(/[^\d]/g, ''), 10);
  const numB = parseInt(String(b.number).replace(/[^\d]/g, ''), 10);
  if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
    return numA - numB;
  }

  // Fallback to natural numeric sort
  return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
}

// ============================================================
// PHASE 3: Greedy Allocation with Floor & Capacity Priority
// ============================================================

/**
 * Generate candidate groups for a target capacity.
 * Strictly limits group size to target capacity.
 */
function generateCandidateGroups(unassigned, matrix, capacity, topK) {
  if (capacity <= 0) return [];
  const groups = [];
  const unassignedSet = new Set(unassigned);

  for (const seedStudent of unassigned) {
    const candidates = (topK.get(seedStudent) || [])
      .filter(c => unassignedSet.has(c.studentId))
      .map(c => c.studentId);

    // If single occupancy or not enough candidates, seed student is a group of 1
    if (capacity === 1) {
      groups.push({ students: [seedStudent], compatibility: 100 });
      continue;
    }

    if (candidates.length < capacity - 1) continue;

    // Consider top pool of candidates
    const pool = candidates.slice(0, Math.min(capacity * 3, candidates.length));

    // Greedy: add candidates one by one up to EXACTLY capacity
    const group = [seedStudent];
    for (const candidate of pool) {
      if (group.length >= capacity) break; // Hard capacity constraint
      const testGroup = [...group, candidate];
      const compat = calculateGroupCompatibility(testGroup, matrix);
      if (compat !== null && compat >= ALGORITHM_CONFIG.minGroupCompatibility) {
        group.push(candidate);
      }
    }

    if (group.length === capacity) {
      const groupCompat = calculateGroupCompatibility(group, matrix);
      if (groupCompat !== null) {
        groups.push({ students: group, compatibility: groupCompat });
      }
    }
  }

  return groups;
}

/**
 * Main greedy allocation function.
 * Priority hierarchy:
 * 1. Compatibility -> determine compatible students
 * 2. Floor priority (1st floor → 2nd floor → higher floors)
 * 3. Room priority within floor (Room 5, Room 6, Room 8, Room 10...)
 * 4. Capacity constraint (strictly assigned students <= room.capacity)
 */
function greedyAllocate(students, rooms, matrix) {
  const topK = buildTopKCandidates(students.map(s => s.id), matrix);
  let unassigned = [...students];
  const allocations = []; // [{ room, studentIds: [...], compatibility }]

  // Filter out any rooms with invalid capacity
  const validRooms = rooms.filter(r => (r.capacity || 0) > 0);

  // Sort rooms by floor ascending, then room number ascending
  const sortedRooms = [...validRooms].sort(compareRoomsByPriority);

  for (const room of sortedRooms) {
    if (unassigned.length === 0) break;

    // Read configured capacity dynamically from room (e.g. 5, 4, 3...)
    const roomCapacity = Number(room.capacity) || 0;
    if (roomCapacity <= 0) continue;

    // Filter unassigned students by room gender if room gender is specified (MALE / FEMALE)
    const eligibleStudents = room.gender && room.gender.toUpperCase() !== 'MIXED'
      ? unassigned.filter(s => !s.gender || s.gender.toUpperCase() === room.gender.toUpperCase())
      : unassigned;

    if (eligibleStudents.length === 0) continue;

    // Target count cannot exceed room's configured capacity or eligible count
    const targetCapacity = Math.min(roomCapacity, eligibleStudents.length);
    if (targetCapacity <= 0) continue;

    const eligibleIds = eligibleStudents.map(s => s.id);

    // Generate candidate groups of size targetCapacity using compatibility
    const candidateGroups = generateCandidateGroups(eligibleIds, matrix, targetCapacity, topK);

    let selectedGroupStudents = [];
    let selectedGroupCompat = 0;

    if (candidateGroups.length > 0) {
      // Choose group with highest mutual compatibility
      candidateGroups.sort((a, b) => b.compatibility - a.compatibility);
      selectedGroupStudents = candidateGroups[0].students.slice(0, roomCapacity);
      selectedGroupCompat = candidateGroups[0].compatibility;
    } else {
      // Fallback: select up to targetCapacity eligible students without hard conflicts
      const safeGroup = [];
      for (const s of eligibleStudents) {
        if (safeGroup.length >= targetCapacity) break;
        const testGroup = [...safeGroup, s.id];
        const compat = calculateGroupCompatibility(testGroup, matrix);
        if (compat !== null) {
          safeGroup.push(s.id);
        }
      }
      selectedGroupStudents = safeGroup.slice(0, roomCapacity);
      selectedGroupCompat = calculateGroupCompatibility(selectedGroupStudents, matrix) ?? 0;
    }

    // STRICT CAPACITY CONSTRAINT: Ensure student count NEVER exceeds room.capacity
    if (selectedGroupStudents.length > roomCapacity) {
      selectedGroupStudents = selectedGroupStudents.slice(0, roomCapacity);
    }

    if (selectedGroupStudents.length > 0) {
      allocations.push({
        room,
        studentIds: selectedGroupStudents,
        compatibility: selectedGroupCompat,
      });

      // Remove assigned students from unassigned pool
      const assignedSet = new Set(selectedGroupStudents);
      unassigned = unassigned.filter(s => !assignedSet.has(s.id));
    }
  }

  return { allocations, unassignedStudents: unassigned };
}

// ============================================================
// PHASE 4: Local Optimization with Strict Capacity Guards
// ============================================================

/**
 * Calculate total compatibility score across all allocations.
 */
function totalAllocationScore(allocations, matrix) {
  let total = 0;
  let count = 0;

  for (const alloc of allocations) {
    const compat = calculateGroupCompatibility(alloc.studentIds, matrix);
    if (compat !== null) {
      total += compat;
      count++;
    }
  }

  return count > 0 ? total / count : 0;
}

/**
 * Local optimization: try swapping students between rooms.
 * Hard capacity constraint: never allows any room to exceed room.capacity.
 */
function localOptimize(allocations, matrix, maxIterations = ALGORITHM_CONFIG.maxOptimizationIterations) {
  let improved = true;
  let iterations = 0;
  let currentAllocations = allocations.map(a => ({ ...a, studentIds: [...a.studentIds] }));

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    const currentScore = totalAllocationScore(currentAllocations, matrix);

    outerLoop: for (let i = 0; i < currentAllocations.length; i++) {
      for (let j = i + 1; j < currentAllocations.length; j++) {
        const roomA = currentAllocations[i];
        const roomB = currentAllocations[j];

        for (let si = 0; si < roomA.studentIds.length; si++) {
          for (let sj = 0; sj < roomB.studentIds.length; sj++) {
            const newA = [...roomA.studentIds];
            const newB = [...roomB.studentIds];
            [newA[si], newB[sj]] = [newB[sj], newA[si]];

            // HARD CAPACITY CHECK: Neither room can exceed its room.capacity
            if (newA.length > roomA.room.capacity || newB.length > roomB.room.capacity) continue;

            // Check hard constraints
            const compatA = calculateGroupCompatibility(newA, matrix);
            const compatB = calculateGroupCompatibility(newB, matrix);
            if (compatA === null || compatB === null) continue; // Hard conflict

            // Compute new total score
            const tempAllocations = currentAllocations.map((a, idx) => {
              if (idx === i) return { ...a, studentIds: newA, compatibility: compatA };
              if (idx === j) return { ...a, studentIds: newB, compatibility: compatB };
              return a;
            });

            const newScore = totalAllocationScore(tempAllocations, matrix);
            if (newScore > currentScore + 0.01) {
              currentAllocations = tempAllocations;
              improved = true;
              break outerLoop;
            }
          }
        }
      }
    }
  }

  console.log(`[Matching] Local optimization: ${iterations} iterations`);
  return currentAllocations;
}

// ============================================================
// MAIN MATCHING PIPELINE
// ============================================================

/**
 * Run the full matching algorithm for a given MatchingRun ID.
 * Stores results in database with hard capacity enforcement.
 */
async function runMatchingPipeline(matchingRunId) {
  const startTime = Date.now();

  try {
    // Update run status to RUNNING
    await prisma.matchingRun.update({
      where: { id: matchingRunId },
      data: { status: 'RUNNING' },
    });

    // 1. Load all registered students
    const rawStudents = await prisma.studentProfile.findMany({
      include: { preference: true },
    });

    if (rawStudents.length === 0) {
      throw new Error('No registered students found.');
    }

    const { HOBBIES_DATABASE } = require('../constants/hobbies');
    const students = rawStudents.map(s => {
      if (!s.preference) {
        return {
          ...s,
          preference: {
            studentProfileId: s.id,
            sleepTime: '5', wakeTime: '5', weekendSleepTime: '6', weekendWakeTime: '6',
            lifestyleType: 2, exerciseHabits: 3,
            hobbies: [HOBBIES_DATABASE[0], HOBBIES_DATABASE[4], HOBBIES_DATABASE[8]],
            studyHoursPerDay: 3, studiesInRoom: true, studyEnvironment: 3, noiseWhileStudy: 3, examIntensity: 3,
            cleanlinessLevel: 3, organizationLevel: 3, bathroomCleanliness: 3, garbageDisposal: 3, sharedSpaceCleanliness: 3,
            noiseTolerance: 3, musicFrequency: 3, gamingFrequency: 2, callsFrequency: 3, mediaFrequency: 3,
            socialLevel: 3, preferredInteraction: 3, visitorFrequency: 3, friendsInRoom: 2, socialRoommatePreference: 3,
            privacyImportance: 3, personalSpaceNeed: 3, sharingComfort: 3, visitorComfort: 3, boundaryStrictness: 3,
            isSmoker: false, requiresNonSmoker: false,
            isComplete: true,
          },
        };
      }
      return s;
    });

    // 2. Load available rooms (Floor 1 first, Floor 2 second, etc.)
    const rooms = await prisma.room.findMany({
      where: { status: 'AVAILABLE' },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });

    if (rooms.length === 0) {
      throw new Error('No available rooms found. Please create rooms before running matching.');
    }

    console.log(`[Matching] Starting: ${students.length} students, ${rooms.length} rooms`);

    // 3. Clear ALL previous allocations across all rooms before generating a new run
    // to prevent double-allocation, stale ghost allocations, or exceeding room capacities.
    await prisma.roomAllocation.deleteMany({});

    await prisma.compatibilityScore.deleteMany({
      where: { matchingRunId },
    });

    // 4. Build compatibility matrix (Phase 1: O(N²))
    console.log('[Matching] Phase 1: Building compatibility matrix...');
    const matrix = buildCompatibilityMatrix(students);

    // 5. Persist all compatibility scores to DB
    const scoreRecords = [];
    for (const [key, value] of matrix.entries()) {
      scoreRecords.push({
        studentAId: value.studentAId,
        studentBId: value.studentBId,
        score: value.score,
        lifestyleScore: value.lifestyleScore,
        studyScore: value.studyScore,
        cleanlinessScore: value.cleanlinessScore,
        socialScore: value.socialScore,
        boundaryScore: value.boundaryScore,
        matchingRunId,
      });
    }

    // Batch insert scores
    if (scoreRecords.length > 0) {
      await prisma.compatibilityScore.createMany({ data: scoreRecords, skipDuplicates: true });
    }

    // 6. Greedy allocation (Phase 2 & 3)
    console.log('[Matching] Phase 3: Running greedy allocation...');
    const { allocations: greedyAllocations, unassignedStudents } = greedyAllocate(students, rooms, matrix);

    // 7. Local optimization (Phase 4)
    console.log('[Matching] Phase 4: Running local optimization...');
    const optimizedAllocations = localOptimize(greedyAllocations, matrix);

    // 8. Persist allocations with STRICT per-room capacity enforcement
    const roomOccupancyMap = new Map(); // roomId -> count of assigned students
    const allocationRecords = [];
    const usedRoomIds = new Set();

    for (const alloc of optimizedAllocations) {
      const room = alloc.room;
      const maxCapacity = room.capacity;
      usedRoomIds.add(room.id);

      for (const studentId of alloc.studentIds) {
        const currentCount = roomOccupancyMap.get(room.id) || 0;

        // HARD MAXIMUM CONSTRAINT: currentStudentsInRoom < room.capacity
        if (currentCount < maxCapacity) {
          allocationRecords.push({
            roomId: room.id,
            studentProfileId: studentId,
            matchingRunId,
            status: 'PENDING',
          });
          roomOccupancyMap.set(room.id, currentCount + 1);
        } else {
          // Current room is full: automatically assign to next available room with capacity
          const fallbackRoom = rooms.find(r => (roomOccupancyMap.get(r.id) || 0) < r.capacity);
          if (fallbackRoom) {
            const fallbackCount = roomOccupancyMap.get(fallbackRoom.id) || 0;
            allocationRecords.push({
              roomId: fallbackRoom.id,
              studentProfileId: studentId,
              matchingRunId,
              status: 'PENDING',
            });
            roomOccupancyMap.set(fallbackRoom.id, fallbackCount + 1);
            usedRoomIds.add(fallbackRoom.id);
          } else {
            console.warn(`[Matching] No room capacity available for student ${studentId}`);
          }
        }
      }
    }

    if (allocationRecords.length > 0) {
      await prisma.roomAllocation.createMany({ data: allocationRecords, skipDuplicates: true });
    }

    // 9. Compute stats
    const validScores = optimizedAllocations
      .map(a => a.compatibility)
      .filter(s => s !== null && s >= 0);

    const avgCompat = validScores.length > 0
      ? validScores.reduce((a, b) => a + b, 0) / validScores.length
      : 0;

    const studentsAssigned = allocationRecords.length;

    // 10. Update MatchingRun
    await prisma.matchingRun.update({
      where: { id: matchingRunId },
      data: {
        status: 'COMPLETED',
        totalStudents: students.length,
        totalRooms: usedRoomIds.size,
        studentsAssigned,
        studentsUnassigned: students.length - studentsAssigned,
        avgCompatibility: Math.round(avgCompat * 100) / 100,
        runDurationMs: Date.now() - startTime,
      },
    });

    console.log(`[Matching] Completed in ${Date.now() - startTime}ms. Avg compatibility: ${avgCompat.toFixed(2)}%, Rooms used: ${usedRoomIds.size}`);

    return {
      totalStudents: students.length,
      totalRooms: usedRoomIds.size,
      studentsAssigned,
      studentsUnassigned: students.length - studentsAssigned,
      avgCompatibility: Math.round(avgCompat * 100) / 100,
      allocations: optimizedAllocations,
    };

  } catch (error) {
    await prisma.matchingRun.update({
      where: { id: matchingRunId },
      data: {
        status: 'FAILED',
        notes: error.message,
        runDurationMs: Date.now() - startTime,
      },
    });
    throw error;
  }
}

module.exports = {
  compareRoomsByPriority,
  buildTopKCandidates,
  generateCandidateGroups,
  greedyAllocate,
  localOptimize,
  totalAllocationScore,
  runMatchingPipeline,
};
