const {
  compareRoomsByPriority,
  greedyAllocate,
} = require('../src/services/matching');
const { buildCompatibilityMatrix } = require('../src/services/compatibility');

// Helper to create mock student object
function createMockStudent(id, gender = 'MALE', sleepTime = '23:00', wakeTime = '07:00') {
  return {
    id,
    gender,
    preference: {
      studentProfileId: id,
      sleepTime,
      wakeTime,
      weekendSleepTime: sleepTime,
      weekendWakeTime: wakeTime,
      lifestyleType: 3,
      exerciseHabits: 3,
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
      musicFrequency: 2,
      gamingFrequency: 2,
      callsFrequency: 2,
      mediaFrequency: 2,
      socialLevel: 3,
      preferredInteraction: 3,
      visitorFrequency: 2,
      friendsInRoom: 2,
      socialRoommatePreference: 3,
      privacyImportance: 3,
      personalSpaceNeed: 3,
      sharingComfort: 3,
      visitorComfort: 3,
      boundaryStrictness: 3,
      isSmoker: false,
      requiresNonSmoker: false,
      blockedStudentIds: [],
    },
  };
}

describe('Room Priority & Floor Priority Comparator (compareRoomsByPriority)', () => {
  test('sorts by floor ascending (1st floor → 2nd floor → 3rd floor)', () => {
    const rooms = [
      { id: 'r3', number: 'Room 10', floor: 3 },
      { id: 'r1', number: 'Room 5', floor: 1 },
      { id: 'r2', number: 'Room 6', floor: 2 },
    ];
    rooms.sort(compareRoomsByPriority);
    expect(rooms.map(r => r.id)).toEqual(['r1', 'r2', 'r3']);
  });

  test('sorts by numeric room order within the same floor (Room 5 → Room 6 → Room 8 → Room 10)', () => {
    const rooms = [
      { id: 'r10', number: 'Room 10', floor: 1 },
      { id: 'r5', number: 'Room 5', floor: 1 },
      { id: 'r8', number: 'Room 8', floor: 1 },
      { id: 'r6', number: 'Room 6', floor: 1 },
    ];
    rooms.sort(compareRoomsByPriority);
    expect(rooms.map(r => r.number)).toEqual(['Room 5', 'Room 6', 'Room 8', 'Room 10']);
  });
});

describe('Greedy Room Allocation Priority & Capacity Rules', () => {
  test('5-sharing room allocation example: 10 students allocated to Room 5 (cap 5) and Room 6 (cap 5)', () => {
    const students = Array.from({ length: 10 }, (_, i) => createMockStudent(`s${i + 1}`));
    const rooms = [
      { id: 'r5', number: 'Room 5', capacity: 5, floor: 1, gender: 'MALE' },
      { id: 'r6', number: 'Room 6', capacity: 5, floor: 1, gender: 'MALE' },
      { id: 'r8', number: 'Room 8', capacity: 5, floor: 1, gender: 'MALE' },
      { id: 'r10', number: 'Room 10', capacity: 5, floor: 1, gender: 'MALE' },
    ];

    const matrix = buildCompatibilityMatrix(students);
    const { allocations, unassignedStudents } = greedyAllocate(students, rooms, matrix);

    expect(unassignedStudents.length).toBe(0);
    expect(allocations.length).toBe(2);

    const room5Alloc = allocations.find(a => a.room.number === 'Room 5');
    const room6Alloc = allocations.find(a => a.room.number === 'Room 6');

    expect(room5Alloc).toBeDefined();
    expect(room5Alloc.studentIds.length).toBe(5);

    expect(room6Alloc).toBeDefined();
    expect(room6Alloc.studentIds.length).toBe(5);

    // Verify no room has more than 5 students
    allocations.forEach(alloc => {
      expect(alloc.studentIds.length).toBeLessThanOrEqual(alloc.room.capacity);
    });
  });

  test('Floor Priority: lower floor rooms are filled completely before moving to higher floors', () => {
    const students = Array.from({ length: 8 }, (_, i) => createMockStudent(`s${i + 1}`));
    const rooms = [
      { id: 'f2_r1', number: 'Room 201', capacity: 5, floor: 2, gender: 'MALE' },
      { id: 'f1_r1', number: 'Room 101', capacity: 5, floor: 1, gender: 'MALE' },
      { id: 'f3_r1', number: 'Room 301', capacity: 5, floor: 3, gender: 'MALE' },
    ];

    const matrix = buildCompatibilityMatrix(students);
    const { allocations } = greedyAllocate(students, rooms, matrix);

    // Room 101 (Floor 1, cap 5) should get 5 students first
    const floor1Alloc = allocations.find(a => a.room.number === 'Room 101');
    expect(floor1Alloc).toBeDefined();
    expect(floor1Alloc.studentIds.length).toBe(5);

    // Room 201 (Floor 2, cap 5) should get remaining 3 students
    const floor2Alloc = allocations.find(a => a.room.number === 'Room 201');
    expect(floor2Alloc).toBeDefined();
    expect(floor2Alloc.studentIds.length).toBe(3);

    // Room 301 (Floor 3) should get 0 students
    const floor3Alloc = allocations.find(a => a.room.number === 'Room 301');
    expect(floor3Alloc).toBeUndefined();
  });

  test('Dynamic capacity enforcement across various student counts (3, 7, 12, 15, 20)', () => {
    const countsToTest = [3, 7, 12, 15, 20];
    const rooms = [
      { id: 'r1', number: 'Room 5', capacity: 5, floor: 1, gender: 'MALE' },
      { id: 'r2', number: 'Room 6', capacity: 5, floor: 1, gender: 'MALE' },
      { id: 'r3', number: 'Room 8', capacity: 5, floor: 2, gender: 'MALE' },
      { id: 'r4', number: 'Room 10', capacity: 5, floor: 2, gender: 'MALE' },
    ];

    for (const count of countsToTest) {
      const students = Array.from({ length: count }, (_, i) => createMockStudent(`st_${count}_${i + 1}`));
      const matrix = buildCompatibilityMatrix(students);
      const { allocations } = greedyAllocate(students, rooms, matrix);

      let totalAssigned = 0;
      allocations.forEach(alloc => {
        expect(alloc.studentIds.length).toBeLessThanOrEqual(alloc.room.capacity);
        totalAssigned += alloc.studentIds.length;
      });

      const expectedAssigned = Math.min(count, 20); // total room capacity is 20
      expect(totalAssigned).toBe(expectedAssigned);
    }
  });

  test('Read actual room capacity dynamically without hardcoding 5 for every room', () => {
    const students = Array.from({ length: 10 }, (_, i) => createMockStudent(`s${i + 1}`));
    const rooms = [
      { id: 'r1', number: 'Room A', capacity: 3, floor: 1, gender: 'MALE' },
      { id: 'r2', number: 'Room B', capacity: 4, floor: 1, gender: 'MALE' },
      { id: 'r3', number: 'Room C', capacity: 5, floor: 2, gender: 'MALE' },
    ];

    const matrix = buildCompatibilityMatrix(students);
    const { allocations } = greedyAllocate(students, rooms, matrix);

    const allocA = allocations.find(a => a.room.number === 'Room A');
    const allocB = allocations.find(a => a.room.number === 'Room B');
    const allocC = allocations.find(a => a.room.number === 'Room C');

    // Room A (cap 3) -> 3 students
    expect(allocA.studentIds.length).toBe(3);
    // Room B (cap 4) -> 4 students
    expect(allocB.studentIds.length).toBe(4);
    // Room C (cap 5) -> remaining 3 students
    expect(allocC.studentIds.length).toBe(3);
  });
});
