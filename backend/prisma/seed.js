const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Helper to create time string
const time = (h, m = 0) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

// Helper to hash password
const hash = (pwd) => bcrypt.hashSync(pwd, 12);

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.feedback.deleteMany();
  await prisma.conflict.deleteMany();
  await prisma.compatibilityScore.deleteMany();
  await prisma.roomAllocation.deleteMany();
  await prisma.matchingRun.deleteMany();
  await prisma.preference.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  // ============================================================
  // ADMIN & MANAGEMENT ACCOUNTS
  // ============================================================
  await prisma.user.createMany({
    data: [
      { email: 'admin@hostelsync.com', passwordHash: hash('Admin@123'), role: 'ADMIN' },
      { email: 'admin2@hostelsync.com', passwordHash: hash('Admin@123'), role: 'ADMIN' },
      { email: 'management@hostelsync.com', passwordHash: hash('Manage@123'), role: 'MANAGEMENT' },
      { email: 'management2@hostelsync.com', passwordHash: hash('Manage@123'), role: 'MANAGEMENT' },
    ],
  });
  console.log('✅ Created admin/management accounts');

  // ============================================================
  // ROOMS (10 rooms with varied capacities)
  // ============================================================
  const rooms = await Promise.all([
    // Block A - 4-person rooms
    prisma.room.create({ data: { number: 'A-101', capacity: 4, gender: 'MALE', floor: 1, building: 'Block A' } }),
    prisma.room.create({ data: { number: 'A-102', capacity: 4, gender: 'MALE', floor: 1, building: 'Block A' } }),
    prisma.room.create({ data: { number: 'A-103', capacity: 4, gender: 'MALE', floor: 1, building: 'Block A' } }),
    prisma.room.create({ data: { number: 'A-201', capacity: 4, gender: 'MALE', floor: 2, building: 'Block A' } }),
    // Block B - Female rooms
    prisma.room.create({ data: { number: 'B-101', capacity: 4, gender: 'FEMALE', floor: 1, building: 'Block B' } }),
    prisma.room.create({ data: { number: 'B-102', capacity: 4, gender: 'FEMALE', floor: 1, building: 'Block B' } }),
    prisma.room.create({ data: { number: 'B-103', capacity: 3, gender: 'FEMALE', floor: 1, building: 'Block B' } }),
    prisma.room.create({ data: { number: 'B-201', capacity: 4, gender: 'FEMALE', floor: 2, building: 'Block B' } }),
    // Block C - Mixed/extra
    prisma.room.create({ data: { number: 'C-101', capacity: 4, gender: 'MALE', floor: 1, building: 'Block C' } }),
    prisma.room.create({ data: { number: 'C-102', capacity: 3, gender: 'MALE', floor: 1, building: 'Block C' } }),
  ]);
  console.log('✅ Created 10 rooms');

  // ============================================================
  // STUDENT DATA
  // Varied profiles to demonstrate algorithm
  // ============================================================

  const studentData = [
    // --- GROUP 1: Night Owls + Heavy Studiers (should match together) ---
    { name: ['Arjun', 'Sharma'], dept: 'Computer Science', year: 2, gender: 'MALE', studentId: 'CS2001', email: 'arjun.sharma@student.com',
      pref: { sleepTime: time(1), wakeTime: time(9), weekendSleepTime: time(2), weekendWakeTime: time(10), lifestyleType: 1, exerciseHabits: 2,
               studyHoursPerDay: 5, studiesInRoom: true, studyEnvironment: 2, noiseWhileStudy: 1, examIntensity: 5,
               cleanlinessLevel: 4, organizationLevel: 4, bathroomCleanliness: 4, garbageDisposal: 4, sharedSpaceCleanliness: 4,
               noiseTolerance: 2, musicFrequency: 1, gamingFrequency: 3, callsFrequency: 2, mediaFrequency: 2,
               socialLevel: 2, preferredInteraction: 2, visitorFrequency: 1, friendsInRoom: 1, socialRoommatePreference: 1,
               privacyImportance: 4, personalSpaceNeed: 4, sharingComfort: 2, visitorComfort: 2, boundaryStrictness: 4,
               isSmoker: false, requiresNonSmoker: true } },
    { name: ['Rahul', 'Verma'], dept: 'Computer Science', year: 2, gender: 'MALE', studentId: 'CS2002', email: 'rahul@student.com',
      pref: { sleepTime: time(0,30), wakeTime: time(8,30), weekendSleepTime: time(2), weekendWakeTime: time(10), lifestyleType: 1, exerciseHabits: 2,
               studyHoursPerDay: 5, studiesInRoom: true, studyEnvironment: 1, noiseWhileStudy: 1, examIntensity: 5,
               cleanlinessLevel: 4, organizationLevel: 3, bathroomCleanliness: 4, garbageDisposal: 4, sharedSpaceCleanliness: 4,
               noiseTolerance: 2, musicFrequency: 1, gamingFrequency: 3, callsFrequency: 2, mediaFrequency: 1,
               socialLevel: 2, preferredInteraction: 2, visitorFrequency: 1, friendsInRoom: 1, socialRoommatePreference: 2,
               privacyImportance: 4, personalSpaceNeed: 4, sharingComfort: 2, visitorComfort: 2, boundaryStrictness: 4,
               isSmoker: false, requiresNonSmoker: true } },
    { name: ['Kiran', 'Patel'], dept: 'Computer Science', year: 2, gender: 'MALE', studentId: 'CS2003', email: 'kiran@student.com',
      pref: { sleepTime: time(1), wakeTime: time(9), weekendSleepTime: time(2), weekendWakeTime: time(11), lifestyleType: 1, exerciseHabits: 1,
               studyHoursPerDay: 5, studiesInRoom: true, studyEnvironment: 2, noiseWhileStudy: 2, examIntensity: 4,
               cleanlinessLevel: 4, organizationLevel: 4, bathroomCleanliness: 4, garbageDisposal: 3, sharedSpaceCleanliness: 4,
               noiseTolerance: 2, musicFrequency: 2, gamingFrequency: 2, callsFrequency: 2, mediaFrequency: 2,
               socialLevel: 2, preferredInteraction: 2, visitorFrequency: 1, friendsInRoom: 1, socialRoommatePreference: 1,
               privacyImportance: 5, personalSpaceNeed: 4, sharingComfort: 2, visitorComfort: 2, boundaryStrictness: 4,
               isSmoker: false, requiresNonSmoker: true } },
    { name: ['Siddharth', 'Nair'], dept: 'Electrical', year: 2, gender: 'MALE', studentId: 'EE2001', email: 'siddharth@student.com',
      pref: { sleepTime: time(0), wakeTime: time(8), weekendSleepTime: time(1), weekendWakeTime: time(9), lifestyleType: 1, exerciseHabits: 2,
               studyHoursPerDay: 5, studiesInRoom: true, studyEnvironment: 2, noiseWhileStudy: 2, examIntensity: 5,
               cleanlinessLevel: 4, organizationLevel: 4, bathroomCleanliness: 4, garbageDisposal: 4, sharedSpaceCleanliness: 4,
               noiseTolerance: 2, musicFrequency: 1, gamingFrequency: 3, callsFrequency: 1, mediaFrequency: 2,
               socialLevel: 2, preferredInteraction: 1, visitorFrequency: 1, friendsInRoom: 1, socialRoommatePreference: 1,
               privacyImportance: 4, personalSpaceNeed: 4, sharingComfort: 2, visitorComfort: 1, boundaryStrictness: 5,
               isSmoker: false, requiresNonSmoker: true } },

    // --- GROUP 2: Early Birds + Fitness Enthusiasts ---
    { name: ['Amit', 'Singh'], dept: 'Mechanical', year: 3, gender: 'MALE', studentId: 'ME3001', email: 'amit@student.com',
      pref: { sleepTime: time(22), wakeTime: time(6), weekendSleepTime: time(22,30), weekendWakeTime: time(7), lifestyleType: 5, exerciseHabits: 5,
               studyHoursPerDay: 3, studiesInRoom: false, studyEnvironment: 3, noiseWhileStudy: 3, examIntensity: 3,
               cleanlinessLevel: 4, organizationLevel: 4, bathroomCleanliness: 4, garbageDisposal: 4, sharedSpaceCleanliness: 4,
               noiseTolerance: 3, musicFrequency: 3, gamingFrequency: 1, callsFrequency: 3, mediaFrequency: 2,
               socialLevel: 4, preferredInteraction: 3, visitorFrequency: 2, friendsInRoom: 2, socialRoommatePreference: 3,
               privacyImportance: 3, personalSpaceNeed: 3, sharingComfort: 3, visitorComfort: 3, boundaryStrictness: 3,
               isSmoker: false, requiresNonSmoker: false } },
    { name: ['Rohit', 'Kumar'], dept: 'Civil', year: 3, gender: 'MALE', studentId: 'CE3001', email: 'rohit@student.com',
      pref: { sleepTime: time(21,30), wakeTime: time(5,30), weekendSleepTime: time(22), weekendWakeTime: time(7), lifestyleType: 5, exerciseHabits: 5,
               studyHoursPerDay: 3, studiesInRoom: false, studyEnvironment: 3, noiseWhileStudy: 3, examIntensity: 3,
               cleanlinessLevel: 5, organizationLevel: 5, bathroomCleanliness: 5, garbageDisposal: 5, sharedSpaceCleanliness: 5,
               noiseTolerance: 3, musicFrequency: 2, gamingFrequency: 1, callsFrequency: 2, mediaFrequency: 2,
               socialLevel: 4, preferredInteraction: 3, visitorFrequency: 2, friendsInRoom: 2, socialRoommatePreference: 3,
               privacyImportance: 3, personalSpaceNeed: 3, sharingComfort: 3, visitorComfort: 3, boundaryStrictness: 2,
               isSmoker: false, requiresNonSmoker: false } },
    { name: ['Vijay', 'Reddy'], dept: 'Civil', year: 3, gender: 'MALE', studentId: 'CE3002', email: 'vijay@student.com',
      pref: { sleepTime: time(22), wakeTime: time(6), weekendSleepTime: time(23), weekendWakeTime: time(7,30), lifestyleType: 4, exerciseHabits: 5,
               studyHoursPerDay: 2, studiesInRoom: false, studyEnvironment: 4, noiseWhileStudy: 4, examIntensity: 2,
               cleanlinessLevel: 4, organizationLevel: 4, bathroomCleanliness: 4, garbageDisposal: 4, sharedSpaceCleanliness: 4,
               noiseTolerance: 4, musicFrequency: 3, gamingFrequency: 2, callsFrequency: 3, mediaFrequency: 3,
               socialLevel: 4, preferredInteraction: 4, visitorFrequency: 3, friendsInRoom: 3, socialRoommatePreference: 4,
               privacyImportance: 2, personalSpaceNeed: 2, sharingComfort: 4, visitorComfort: 4, boundaryStrictness: 2,
               isSmoker: false, requiresNonSmoker: false } },
    { name: ['Suresh', 'Yadav'], dept: 'Mechanical', year: 3, gender: 'MALE', studentId: 'ME3002', email: 'suresh@student.com',
      pref: { sleepTime: time(22,30), wakeTime: time(6), weekendSleepTime: time(23), weekendWakeTime: time(8), lifestyleType: 4, exerciseHabits: 4,
               studyHoursPerDay: 3, studiesInRoom: true, studyEnvironment: 3, noiseWhileStudy: 3, examIntensity: 3,
               cleanlinessLevel: 4, organizationLevel: 3, bathroomCleanliness: 4, garbageDisposal: 4, sharedSpaceCleanliness: 4,
               noiseTolerance: 3, musicFrequency: 3, gamingFrequency: 2, callsFrequency: 3, mediaFrequency: 3,
               socialLevel: 3, preferredInteraction: 3, visitorFrequency: 2, friendsInRoom: 2, socialRoommatePreference: 3,
               privacyImportance: 3, personalSpaceNeed: 3, sharingComfort: 3, visitorComfort: 3, boundaryStrictness: 3,
               isSmoker: false, requiresNonSmoker: false } },

    // --- GROUP 3: Social/Extrovert Night-Party types ---
    { name: ['Aditya', 'Mehta'], dept: 'Management', year: 1, gender: 'MALE', studentId: 'MBA1001', email: 'aditya@student.com',
      pref: { sleepTime: time(2), wakeTime: time(10), weekendSleepTime: time(4), weekendWakeTime: time(12), lifestyleType: 2, exerciseHabits: 2,
               studyHoursPerDay: 2, studiesInRoom: false, studyEnvironment: 5, noiseWhileStudy: 5, examIntensity: 2,
               cleanlinessLevel: 2, organizationLevel: 2, bathroomCleanliness: 3, garbageDisposal: 2, sharedSpaceCleanliness: 2,
               noiseTolerance: 5, musicFrequency: 5, gamingFrequency: 4, callsFrequency: 5, mediaFrequency: 4,
               socialLevel: 5, preferredInteraction: 5, visitorFrequency: 5, friendsInRoom: 5, socialRoommatePreference: 5,
               privacyImportance: 1, personalSpaceNeed: 1, sharingComfort: 5, visitorComfort: 5, boundaryStrictness: 1,
               isSmoker: true, requiresNonSmoker: false } },
    { name: ['Nikhil', 'Joshi'], dept: 'Management', year: 1, gender: 'MALE', studentId: 'MBA1002', email: 'nikhil@student.com',
      pref: { sleepTime: time(2,30), wakeTime: time(10,30), weekendSleepTime: time(4), weekendWakeTime: time(12), lifestyleType: 1, exerciseHabits: 2,
               studyHoursPerDay: 2, studiesInRoom: false, studyEnvironment: 5, noiseWhileStudy: 5, examIntensity: 1,
               cleanlinessLevel: 2, organizationLevel: 2, bathroomCleanliness: 2, garbageDisposal: 2, sharedSpaceCleanliness: 2,
               noiseTolerance: 5, musicFrequency: 5, gamingFrequency: 3, callsFrequency: 5, mediaFrequency: 5,
               socialLevel: 5, preferredInteraction: 5, visitorFrequency: 5, friendsInRoom: 5, socialRoommatePreference: 5,
               privacyImportance: 1, personalSpaceNeed: 1, sharingComfort: 5, visitorComfort: 5, boundaryStrictness: 1,
               isSmoker: true, requiresNonSmoker: false } },
    { name: ['Dev', 'Kapoor'], dept: 'Arts', year: 2, gender: 'MALE', studentId: 'AR2001', email: 'dev@student.com',
      pref: { sleepTime: time(1,30), wakeTime: time(10), weekendSleepTime: time(3), weekendWakeTime: time(11), lifestyleType: 2, exerciseHabits: 3,
               studyHoursPerDay: 2, studiesInRoom: false, studyEnvironment: 4, noiseWhileStudy: 4, examIntensity: 2,
               cleanlinessLevel: 3, organizationLevel: 2, bathroomCleanliness: 3, garbageDisposal: 2, sharedSpaceCleanliness: 3,
               noiseTolerance: 4, musicFrequency: 5, gamingFrequency: 3, callsFrequency: 4, mediaFrequency: 5,
               socialLevel: 5, preferredInteraction: 4, visitorFrequency: 4, friendsInRoom: 4, socialRoommatePreference: 5,
               privacyImportance: 1, personalSpaceNeed: 2, sharingComfort: 4, visitorComfort: 5, boundaryStrictness: 1,
               isSmoker: false, requiresNonSmoker: false } },
    { name: ['Akash', 'Pandey'], dept: 'Arts', year: 2, gender: 'MALE', studentId: 'AR2002', email: 'akash@student.com',
      pref: { sleepTime: time(1), wakeTime: time(9,30), weekendSleepTime: time(3,30), weekendWakeTime: time(11,30), lifestyleType: 2, exerciseHabits: 2,
               studyHoursPerDay: 2, studiesInRoom: false, studyEnvironment: 5, noiseWhileStudy: 5, examIntensity: 2,
               cleanlinessLevel: 2, organizationLevel: 2, bathroomCleanliness: 3, garbageDisposal: 3, sharedSpaceCleanliness: 2,
               noiseTolerance: 5, musicFrequency: 4, gamingFrequency: 4, callsFrequency: 4, mediaFrequency: 5,
               socialLevel: 5, preferredInteraction: 5, visitorFrequency: 4, friendsInRoom: 4, socialRoommatePreference: 5,
               privacyImportance: 1, personalSpaceNeed: 1, sharingComfort: 5, visitorComfort: 5, boundaryStrictness: 1,
               isSmoker: false, requiresNonSmoker: false } },

    // --- FEMALE STUDENTS ---
    { name: ['Priya', 'Sharma'], dept: 'Computer Science', year: 2, gender: 'FEMALE', studentId: 'FCS2001', email: 'priya@student.com',
      pref: { sleepTime: time(23), wakeTime: time(7), weekendSleepTime: time(23,30), weekendWakeTime: time(8), lifestyleType: 4, exerciseHabits: 3,
               studyHoursPerDay: 4, studiesInRoom: true, studyEnvironment: 2, noiseWhileStudy: 2, examIntensity: 4,
               cleanlinessLevel: 5, organizationLevel: 5, bathroomCleanliness: 5, garbageDisposal: 5, sharedSpaceCleanliness: 5,
               noiseTolerance: 2, musicFrequency: 2, gamingFrequency: 1, callsFrequency: 3, mediaFrequency: 2,
               socialLevel: 3, preferredInteraction: 3, visitorFrequency: 2, friendsInRoom: 2, socialRoommatePreference: 2,
               privacyImportance: 4, personalSpaceNeed: 4, sharingComfort: 2, visitorComfort: 2, boundaryStrictness: 4,
               isSmoker: false, requiresNonSmoker: true } },
    { name: ['Anjali', 'Gupta'], dept: 'Computer Science', year: 2, gender: 'FEMALE', studentId: 'FCS2002', email: 'anjali@student.com',
      pref: { sleepTime: time(23,30), wakeTime: time(7,30), weekendSleepTime: time(0), weekendWakeTime: time(9), lifestyleType: 3, exerciseHabits: 3,
               studyHoursPerDay: 4, studiesInRoom: true, studyEnvironment: 2, noiseWhileStudy: 2, examIntensity: 4,
               cleanlinessLevel: 5, organizationLevel: 5, bathroomCleanliness: 5, garbageDisposal: 5, sharedSpaceCleanliness: 5,
               noiseTolerance: 2, musicFrequency: 2, gamingFrequency: 1, callsFrequency: 3, mediaFrequency: 2,
               socialLevel: 3, preferredInteraction: 3, visitorFrequency: 2, friendsInRoom: 2, socialRoommatePreference: 2,
               privacyImportance: 4, personalSpaceNeed: 4, sharingComfort: 2, visitorComfort: 2, boundaryStrictness: 4,
               isSmoker: false, requiresNonSmoker: true } },
    { name: ['Meera', 'Jain'], dept: 'Biological Science', year: 1, gender: 'FEMALE', studentId: 'BIO1001', email: 'meera@student.com',
      pref: { sleepTime: time(22,30), wakeTime: time(6,30), weekendSleepTime: time(23), weekendWakeTime: time(8), lifestyleType: 4, exerciseHabits: 4,
               studyHoursPerDay: 5, studiesInRoom: true, studyEnvironment: 1, noiseWhileStudy: 1, examIntensity: 5,
               cleanlinessLevel: 5, organizationLevel: 5, bathroomCleanliness: 5, garbageDisposal: 5, sharedSpaceCleanliness: 5,
               noiseTolerance: 1, musicFrequency: 1, gamingFrequency: 1, callsFrequency: 2, mediaFrequency: 1,
               socialLevel: 2, preferredInteraction: 1, visitorFrequency: 1, friendsInRoom: 1, socialRoommatePreference: 1,
               privacyImportance: 5, personalSpaceNeed: 5, sharingComfort: 1, visitorComfort: 1, boundaryStrictness: 5,
               isSmoker: false, requiresNonSmoker: true } },
    { name: ['Sneha', 'Pillai'], dept: 'Biological Science', year: 1, gender: 'FEMALE', studentId: 'BIO1002', email: 'sneha@student.com',
      pref: { sleepTime: time(22), wakeTime: time(6), weekendSleepTime: time(22,30), weekendWakeTime: time(7), lifestyleType: 5, exerciseHabits: 4,
               studyHoursPerDay: 5, studiesInRoom: true, studyEnvironment: 1, noiseWhileStudy: 1, examIntensity: 5,
               cleanlinessLevel: 5, organizationLevel: 5, bathroomCleanliness: 5, garbageDisposal: 5, sharedSpaceCleanliness: 5,
               noiseTolerance: 1, musicFrequency: 1, gamingFrequency: 1, callsFrequency: 2, mediaFrequency: 1,
               socialLevel: 2, preferredInteraction: 2, visitorFrequency: 1, friendsInRoom: 1, socialRoommatePreference: 1,
               privacyImportance: 5, personalSpaceNeed: 5, sharingComfort: 1, visitorComfort: 1, boundaryStrictness: 5,
               isSmoker: false, requiresNonSmoker: true } },
    { name: ['Divya', 'Reddy'], dept: 'Electronics', year: 3, gender: 'FEMALE', studentId: 'EC3001', email: 'divya@student.com',
      pref: { sleepTime: time(23), wakeTime: time(7), weekendSleepTime: time(0), weekendWakeTime: time(8), lifestyleType: 3, exerciseHabits: 3,
               studyHoursPerDay: 3, studiesInRoom: true, studyEnvironment: 3, noiseWhileStudy: 3, examIntensity: 3,
               cleanlinessLevel: 4, organizationLevel: 4, bathroomCleanliness: 4, garbageDisposal: 4, sharedSpaceCleanliness: 4,
               noiseTolerance: 3, musicFrequency: 3, gamingFrequency: 1, callsFrequency: 3, mediaFrequency: 3,
               socialLevel: 3, preferredInteraction: 3, visitorFrequency: 2, friendsInRoom: 2, socialRoommatePreference: 3,
               privacyImportance: 3, personalSpaceNeed: 3, sharingComfort: 3, visitorComfort: 3, boundaryStrictness: 3,
               isSmoker: false, requiresNonSmoker: false } },
    { name: ['Kavya', 'Nair'], dept: 'Electronics', year: 3, gender: 'FEMALE', studentId: 'EC3002', email: 'kavya@student.com',
      pref: { sleepTime: time(23), wakeTime: time(7,30), weekendSleepTime: time(0), weekendWakeTime: time(9), lifestyleType: 3, exerciseHabits: 3,
               studyHoursPerDay: 3, studiesInRoom: true, studyEnvironment: 3, noiseWhileStudy: 3, examIntensity: 3,
               cleanlinessLevel: 4, organizationLevel: 4, bathroomCleanliness: 4, garbageDisposal: 4, sharedSpaceCleanliness: 4,
               noiseTolerance: 3, musicFrequency: 3, gamingFrequency: 1, callsFrequency: 3, mediaFrequency: 3,
               socialLevel: 3, preferredInteraction: 3, visitorFrequency: 2, friendsInRoom: 2, socialRoommatePreference: 3,
               privacyImportance: 3, personalSpaceNeed: 3, sharingComfort: 3, visitorComfort: 3, boundaryStrictness: 3,
               isSmoker: false, requiresNonSmoker: false } },
    { name: ['Riya', 'Chatterjee'], dept: 'Chemistry', year: 1, gender: 'FEMALE', studentId: 'CH1001', email: 'riya@student.com',
      pref: { sleepTime: time(1), wakeTime: time(9), weekendSleepTime: time(2), weekendWakeTime: time(10), lifestyleType: 2, exerciseHabits: 2,
               studyHoursPerDay: 3, studiesInRoom: false, studyEnvironment: 4, noiseWhileStudy: 4, examIntensity: 3,
               cleanlinessLevel: 3, organizationLevel: 3, bathroomCleanliness: 3, garbageDisposal: 3, sharedSpaceCleanliness: 3,
               noiseTolerance: 4, musicFrequency: 4, gamingFrequency: 2, callsFrequency: 4, mediaFrequency: 4,
               socialLevel: 4, preferredInteraction: 4, visitorFrequency: 3, friendsInRoom: 3, socialRoommatePreference: 4,
               privacyImportance: 2, personalSpaceNeed: 2, sharingComfort: 4, visitorComfort: 4, boundaryStrictness: 2,
               isSmoker: false, requiresNonSmoker: false } },
    { name: ['Ishaan', 'Malhotra'], dept: 'Physics', year: 4, gender: 'MALE', studentId: 'PH4001', email: 'ishaan@student.com',
      pref: { sleepTime: time(23,30), wakeTime: time(7), weekendSleepTime: time(1), weekendWakeTime: time(9), lifestyleType: 3, exerciseHabits: 3,
               studyHoursPerDay: 4, studiesInRoom: true, studyEnvironment: 2, noiseWhileStudy: 2, examIntensity: 4,
               cleanlinessLevel: 4, organizationLevel: 4, bathroomCleanliness: 4, garbageDisposal: 4, sharedSpaceCleanliness: 4,
               noiseTolerance: 2, musicFrequency: 2, gamingFrequency: 2, callsFrequency: 2, mediaFrequency: 2,
               socialLevel: 2, preferredInteraction: 2, visitorFrequency: 1, friendsInRoom: 1, socialRoommatePreference: 2,
               privacyImportance: 4, personalSpaceNeed: 4, sharingComfort: 2, visitorComfort: 2, boundaryStrictness: 4,
               isSmoker: false, requiresNonSmoker: true } },
    { name: ['Manish', 'Dubey'], dept: 'Physics', year: 4, gender: 'MALE', studentId: 'PH4002', email: 'manish@student.com',
      pref: { sleepTime: time(0), wakeTime: time(7,30), weekendSleepTime: time(1), weekendWakeTime: time(9), lifestyleType: 3, exerciseHabits: 3,
               studyHoursPerDay: 4, studiesInRoom: true, studyEnvironment: 2, noiseWhileStudy: 2, examIntensity: 4,
               cleanlinessLevel: 4, organizationLevel: 4, bathroomCleanliness: 4, garbageDisposal: 4, sharedSpaceCleanliness: 4,
               noiseTolerance: 2, musicFrequency: 2, gamingFrequency: 2, callsFrequency: 2, mediaFrequency: 2,
               socialLevel: 2, preferredInteraction: 2, visitorFrequency: 1, friendsInRoom: 1, socialRoommatePreference: 2,
               privacyImportance: 4, personalSpaceNeed: 4, sharingComfort: 3, visitorComfort: 2, boundaryStrictness: 4,
               isSmoker: false, requiresNonSmoker: true } },
    // Demo: Hard conflict - smoker who will clash with Arjun, Rahul, Kiran (requiresNonSmoker)
    { name: ['Rahul', 'Das'], dept: 'Management', year: 4, gender: 'MALE', studentId: 'MBA4001', email: 'rdas@student.com',
      pref: { sleepTime: time(1,30), wakeTime: time(10), weekendSleepTime: time(3), weekendWakeTime: time(11), lifestyleType: 2, exerciseHabits: 2,
               studyHoursPerDay: 2, studiesInRoom: false, studyEnvironment: 5, noiseWhileStudy: 5, examIntensity: 2,
               cleanlinessLevel: 2, organizationLevel: 2, bathroomCleanliness: 2, garbageDisposal: 2, sharedSpaceCleanliness: 2,
               noiseTolerance: 5, musicFrequency: 5, gamingFrequency: 4, callsFrequency: 5, mediaFrequency: 5,
               socialLevel: 5, preferredInteraction: 5, visitorFrequency: 5, friendsInRoom: 5, socialRoommatePreference: 5,
               privacyImportance: 1, personalSpaceNeed: 1, sharingComfort: 5, visitorComfort: 5, boundaryStrictness: 1,
               isSmoker: true, requiresNonSmoker: false } },
  ];

  // Additional bulk students (to reach 50+)
  const bulkMaleStudents = [
    ['Tarun', 'Teja', 'Information Technology', 'IT3001', 1, 23, 7, 4, false],
    ['Ravi', 'Shankar', 'Information Technology', 'IT3002', 1, 23, 7, 4, false],
    ['Srikanth', 'Reddy', 'Computer Science', 'CS4001', 2, 0, 8, 5, true],
    ['Venu', 'Gopal', 'Computer Science', 'CS4002', 2, 0, 8, 5, true],
    ['Balaji', 'Rao', 'Mechanical', 'ME4001', 3, 22, 6, 4, false],
    ['Naveen', 'Chandra', 'Civil', 'CE4001', 3, 22, 6, 4, false],
    ['Praveen', 'Kumar', 'Electronics', 'EC2001', 2, 23, 7, 4, true],
    ['Lokesh', 'Babu', 'Electronics', 'EC2002', 2, 23, 7, 4, true],
    ['Harish', 'Mohan', 'Chemistry', 'CH3001', 3, 22, 7, 3, false],
    ['Rajesh', 'Babu', 'Physics', 'PH2001', 2, 22, 7, 3, false],
    ['Venkat', 'Raju', 'Electrical', 'EE3001', 3, 0, 8, 5, true],
    ['Deepak', 'Varma', 'Electrical', 'EE3002', 3, 0, 8, 5, true],
    ['Suresh', 'Babu', 'Management', 'MBA2001', 2, 2, 10, 2, false],
    ['Kishore', 'Kumar', 'Management', 'MBA2002', 2, 2, 10, 2, false],
    ['Srinivas', 'Rao', 'Mathematics', 'MA2001', 2, 23, 7, 4, true],
    ['Ramesh', 'Krishnan', 'Mathematics', 'MA2002', 2, 23, 7, 4, true],
  ];

  const bulkFemaleStudents = [
    ['Lakshmi', 'Priya', 'Computer Science', 'FCS3001', 1, 22, 6, 5, true],
    ['Sujatha', 'Devi', 'Computer Science', 'FCS3002', 1, 22, 6, 5, true],
    ['Bhavani', 'Reddy', 'Biological Science', 'BIO2001', 2, 22, 6, 5, true],
    ['Padmavathi', 'Rao', 'Biological Science', 'BIO2002', 2, 22, 6, 5, true],
    ['Sushma', 'Gowda', 'Electronics', 'EC4001', 3, 23, 7, 4, false],
    ['Ramya', 'Krishna', 'Electronics', 'EC4002', 3, 23, 7, 4, false],
    ['Usha', 'Rani', 'Chemistry', 'CH2001', 2, 23, 7, 3, false],
    ['Hema', 'Latha', 'Physics', 'PH3001', 3, 22, 7, 3, false],
    ['Geeta', 'Kumari', 'Mathematics', 'MA3001', 2, 22, 7, 4, true],
    ['Saritha', 'Nair', 'Management', 'MBA3001', 3, 1, 9, 2, false],
    ['Radha', 'Krishnan', 'Arts', 'AR3001', 3, 1, 9, 2, false],
    ['Sarada', 'Devi', 'Arts', 'AR3002', 3, 1, 9, 2, false],
  ];

  // Create students in parallel batches
  for (const s of studentData) {
    const user = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash: hash('Student@123'),
        role: 'STUDENT',
        profile: {
          create: {
            firstName: s.name[0],
            lastName: s.name[1],
            studentId: s.studentId,
            department: s.dept,
            year: s.year,
            gender: s.gender,
            profileComplete: true,
            preference: { create: { ...s.pref, isComplete: true } },
          },
        },
      },
    });
  }

  // Bulk male students
  for (const [first, last, dept, studentId, year, sleepH, wakeH, studyH, requiresNonSmoker] of bulkMaleStudents) {
    const sleepT = time(sleepH);
    const wakeT = time(wakeH);
    const studySlot = studyH === 5 ? 5 : studyH === 4 ? 4 : 3;
    await prisma.user.create({
      data: {
        email: `${studentId.toLowerCase()}@student.com`,
        passwordHash: hash('Student@123'),
        role: 'STUDENT',
        profile: {
          create: {
            firstName: first, lastName: last, studentId, department: dept, year, gender: 'MALE',
            profileComplete: true,
            preference: {
              create: {
                sleepTime: sleepT, wakeTime: wakeT,
                weekendSleepTime: time(sleepH + 1 > 23 ? sleepH + 1 - 24 : sleepH + 1),
                weekendWakeTime: time(wakeH + 1 > 12 ? wakeH + 1 : wakeH + 1),
                lifestyleType: sleepH >= 22 ? 4 : 2, exerciseHabits: 3,
                studyHoursPerDay: studySlot, studiesInRoom: studySlot >= 4,
                studyEnvironment: studySlot >= 4 ? 2 : 3,
                noiseWhileStudy: studySlot >= 4 ? 2 : 3, examIntensity: studySlot,
                cleanlinessLevel: 4, organizationLevel: 3, bathroomCleanliness: 4,
                garbageDisposal: 4, sharedSpaceCleanliness: 4,
                noiseTolerance: studySlot >= 4 ? 2 : 3,
                musicFrequency: 2, gamingFrequency: 2, callsFrequency: 2, mediaFrequency: 2,
                socialLevel: 3, preferredInteraction: 3, visitorFrequency: 2,
                friendsInRoom: 2, socialRoommatePreference: 3,
                privacyImportance: 3, personalSpaceNeed: 3, sharingComfort: 3, visitorComfort: 3, boundaryStrictness: 3,
                isSmoker: false, requiresNonSmoker, isComplete: true,
              },
            },
          },
        },
      },
    });
  }

  // Bulk female students
  for (const [first, last, dept, studentId, year, sleepH, wakeH, studyH, requiresNonSmoker] of bulkFemaleStudents) {
    const sleepT = time(sleepH);
    const wakeT = time(wakeH);
    const studySlot = studyH === 5 ? 5 : studyH === 4 ? 4 : 3;
    await prisma.user.create({
      data: {
        email: `${studentId.toLowerCase()}@student.com`,
        passwordHash: hash('Student@123'),
        role: 'STUDENT',
        profile: {
          create: {
            firstName: first, lastName: last, studentId, department: dept, year, gender: 'FEMALE',
            profileComplete: true,
            preference: {
              create: {
                sleepTime: sleepT, wakeTime: wakeT,
                weekendSleepTime: time(sleepH + 1 > 23 ? sleepH + 1 - 24 : sleepH + 1),
                weekendWakeTime: time(wakeH + 1 > 12 ? wakeH + 1 : wakeH + 1),
                lifestyleType: sleepH >= 22 ? 4 : 2, exerciseHabits: 3,
                studyHoursPerDay: studySlot, studiesInRoom: studySlot >= 4,
                studyEnvironment: studySlot >= 4 ? 2 : 3,
                noiseWhileStudy: studySlot >= 4 ? 2 : 3, examIntensity: studySlot,
                cleanlinessLevel: 5, organizationLevel: 4, bathroomCleanliness: 5,
                garbageDisposal: 4, sharedSpaceCleanliness: 5,
                noiseTolerance: studySlot >= 4 ? 2 : 3,
                musicFrequency: 2, gamingFrequency: 1, callsFrequency: 3, mediaFrequency: 2,
                socialLevel: 3, preferredInteraction: 3, visitorFrequency: 2,
                friendsInRoom: 2, socialRoommatePreference: 3,
                privacyImportance: 4, personalSpaceNeed: 4, sharingComfort: 2, visitorComfort: 3, boundaryStrictness: 4,
                isSmoker: false, requiresNonSmoker, isComplete: true,
              },
            },
          },
        },
      },
    });
  }

  const finalCount = await prisma.studentProfile.count();
  const roomCount = await prisma.room.count();
  console.log(`✅ Created ${finalCount} students and ${roomCount} rooms`);
  console.log('\n📋 TEST ACCOUNTS:');
  console.log('  Admin:      admin@hostelsync.com        / Admin@123');
  console.log('  Admin 2:    admin2@hostelsync.com       / Admin@123');
  console.log('  Management: management@hostelsync.com   / Manage@123');
  console.log('  Student:    arjun@student.com           / Student@123');
  console.log('  Student:    priya@student.com           / Student@123');
  console.log('  (All students use password: Student@123)');
  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
