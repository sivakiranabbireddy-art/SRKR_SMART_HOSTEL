const bcrypt = require('bcryptjs');

/**
 * HostelSync — Mock Data Generator
 *
 * 55 rooms | 5 floors | All MALE
 * 35 × 4-sharing + 20 × 5-sharing = 240 beds
 * 40 male students | Registration: 25B95A0501XX
 * Time preferences stored as string indices "1"–"10"
 */

// ============================================================
// SLEEP TIME INDEX → representative midpoint "HH:MM"
// Used by compatibility engine (see compatibility.js)
// 1 = Before 10 PM  …  10 = After 2 AM
// ============================================================
// WAKE TIME INDEX → representative midpoint "HH:MM"
// 1 = Before 5:30 AM  …  10 = After 10 AM
// ============================================================

function makePrefs(base, idx = 0) {
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const clampTime = (t, offset) => String(clamp(parseInt(t, 10) + offset, 1, 10));

  // Deterministic slight variations based on student index
  const timeOffset = (idx % 3 === 1) ? 1 : (idx % 3 === 2) ? -1 : 0;
  const numOffset = (idx % 2 === 1) ? 1 : 0;
  const altNumOffset = (idx % 4 === 1) ? -1 : (idx % 4 === 3) ? 1 : 0;

  const { HOBBIES_DATABASE } = require('../constants/hobbies');
  const h1 = HOBBIES_DATABASE[(idx * 3) % HOBBIES_DATABASE.length];
  const h2 = HOBBIES_DATABASE[(idx * 3 + 4) % HOBBIES_DATABASE.length];
  const h3 = HOBBIES_DATABASE[(idx * 3 + 9) % HOBBIES_DATABASE.length];
  const h4 = HOBBIES_DATABASE[(idx * 3 + 14) % HOBBIES_DATABASE.length];
  const studentHobbies = Array.from(new Set([h1, h2, h3, h4])).slice(0, 4);

  return {
    sleepTime: clampTime(base.sl, timeOffset),
    wakeTime: clampTime(base.wk, timeOffset),
    weekendSleepTime: clampTime(base.wsl, timeOffset),
    weekendWakeTime: clampTime(base.wwk, timeOffset),
    lifestyleType: clamp(base.ls + altNumOffset, 1, 4),
    exerciseHabits: clamp(base.ex + numOffset, 1, 5),
    hobbies: studentHobbies,
    studyHoursPerDay: clamp(base.sh + altNumOffset, 1, 5),
    studiesInRoom: (idx % 5 === 0) ? !base.sir : base.sir,
    studyEnvironment: clamp(base.se + altNumOffset, 1, 5),
    noiseWhileStudy: clamp(base.nws + numOffset, 1, 5),
    examIntensity: clamp(base.ei + altNumOffset, 1, 5),
    cleanlinessLevel: clamp(base.cl + altNumOffset, 1, 5),
    organizationLevel: clamp(base.ol + numOffset, 1, 5),
    bathroomCleanliness: clamp(base.bc + altNumOffset, 1, 5),
    garbageDisposal: clamp(base.gd + numOffset, 1, 5),
    sharedSpaceCleanliness: clamp(base.ssc + altNumOffset, 1, 5),
    noiseTolerance: clamp(base.nt + altNumOffset, 1, 5),
    musicFrequency: clamp(base.mf + numOffset, 1, 5),
    gamingFrequency: clamp(base.gf + altNumOffset, 1, 5),
    callsFrequency: clamp(base.cf + numOffset, 1, 5),
    mediaFrequency: clamp(base.mdf + altNumOffset, 1, 5),
    socialLevel: clamp(base.sl2 + altNumOffset, 1, 5),
    preferredInteraction: clamp(base.pi + numOffset, 1, 5),
    visitorFrequency: clamp(base.vf + altNumOffset, 1, 5),
    friendsInRoom: clamp(base.fir + numOffset, 1, 5),
    socialRoommatePreference: clamp(base.srp + altNumOffset, 1, 5),
    privacyImportance: clamp(base.priv + altNumOffset, 1, 5),
    personalSpaceNeed: clamp(base.psn + numOffset, 1, 5),
    sharingComfort: clamp(base.sc + altNumOffset, 1, 5),
    visitorComfort: clamp(base.vc + numOffset, 1, 5),
    boundaryStrictness: clamp(base.bs + altNumOffset, 1, 5),
    isSmoker: (idx === 3 || idx === 18),
    requiresNonSmoker: (idx % 6 === 0),
    blockedStudentIds: [],
    hasSpecialRequirements: false,
    specialRequirements: null,
    isComplete: true,
  };
}

// Pre-defined preference archetypes
const ARCHETYPES = {
  // Early Bird / Disciplined
  A: { sl: '3', wk: '2', wsl: '4', wwk: '3', ls: 4, ex: 5, sh: 5, sir: true, se: 1, nws: 1, ei: 5, cl: 5, ol: 5, bc: 5, gd: 5, ssc: 5, nt: 2, mf: 1, gf: 1, cf: 2, mdf: 2, sl2: 3, pi: 2, vf: 2, fir: 2, srp: 2, priv: 4, psn: 4, sc: 3, vc: 3, bs: 4 },
  // Night Owl / Social
  B: { sl: '8', wk: '8', wsl: '9', wwk: '9', ls: 2, ex: 2, sh: 3, sir: false, se: 4, nws: 4, ei: 3, cl: 3, ol: 2, bc: 3, gd: 2, ssc: 3, nt: 5, mf: 4, gf: 4, cf: 4, mdf: 4, sl2: 5, pi: 5, vf: 4, fir: 4, srp: 5, priv: 2, psn: 2, sc: 4, vc: 4, bs: 2 },
  // Balanced
  C: { sl: '5', wk: '5', wsl: '6', wwk: '6', ls: 3, ex: 3, sh: 3, sir: true, se: 3, nws: 3, ei: 3, cl: 3, ol: 3, bc: 3, gd: 3, ssc: 3, nt: 3, mf: 3, gf: 2, cf: 3, mdf: 3, sl2: 3, pi: 3, vf: 3, fir: 2, srp: 3, priv: 3, psn: 3, sc: 3, vc: 3, bs: 3 },
  // Studious / Quiet
  D: { sl: '4', wk: '3', wsl: '4', wwk: '4', ls: 3, ex: 3, sh: 5, sir: true, se: 1, nws: 1, ei: 5, cl: 4, ol: 4, bc: 4, gd: 4, ssc: 4, nt: 2, mf: 1, gf: 1, cf: 2, mdf: 1, sl2: 2, pi: 2, vf: 1, fir: 1, srp: 2, priv: 5, psn: 5, sc: 2, vc: 2, bs: 5 },
  // Late Night / Moderate
  E: { sl: '7', wk: '7', wsl: '8', wwk: '8', ls: 2, ex: 2, sh: 2, sir: false, se: 3, nws: 3, ei: 2, cl: 3, ol: 3, bc: 3, gd: 3, ssc: 3, nt: 4, mf: 3, gf: 3, cf: 3, mdf: 3, sl2: 4, pi: 4, vf: 3, fir: 3, srp: 4, priv: 2, psn: 2, sc: 4, vc: 4, bs: 2 },
};

function generateInitialData() {
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('Admin@123', salt);
  const manageHash = bcrypt.hashSync('Manage@123', salt);
  const studHash = bcrypt.hashSync('Student@123', salt);

  // ============================================================
  // USERS — Admin + Management + 40 Male Students
  // Register number format: xxB95A0xxx (xx = Year joined, xxx = student number)
  // ============================================================
  const studentData = [
    // id-suffix  email                           name                    regNo           dept              yr  type
    ['01', 'arjun.sharma@student.com', 'Arjun', 'Sharma', '23B95A0501', 'Computer Science', 2, 'C'],
    ['02', 'rohit.verma@student.com', 'Rohit', 'Verma', '23B95A0502', 'Computer Science', 2, 'C'],
    ['03', 'karan.patel@student.com', 'Karan', 'Patel', '24B95A0503', 'Electrical Engineering', 1, 'A'],
    ['04', 'vikram.singh@student.com', 'Vikram', 'Singh', '24B95A0504', 'Electrical Engineering', 1, 'A'],
    ['05', 'rahul.gupta@student.com', 'Rahul', 'Gupta', '21B95A0505', 'Electrical Engineering', 4, 'A'],
    ['06', 'aditya.kumar@student.com', 'Aditya', 'Kumar', '22B95A0506', 'Mechanical Engineering', 3, 'A'],
    ['07', 'sanjay.rao@student.com', 'Sanjay', 'Rao', '22B95A0507', 'Computer Science', 3, 'B'],
    ['08', 'nikhil.joshi@student.com', 'Nikhil', 'Joshi', '23B95A0508', 'Electrical Engineering', 2, 'B'],
    ['09', 'priyank.mehta@student.com', 'Priyank', 'Mehta', '24B95A0509', 'Mechanical Engineering', 1, 'B'],
    ['10', 'suresh.nair@student.com', 'Suresh', 'Nair', '21B95A0510', 'Information Technology', 4, 'C'],
    ['11', 'deepak.reddy@student.com', 'Deepak', 'Reddy', '24B95A0511', 'Computer Science', 1, 'D'],
    ['12', 'anand.krishnan@student.com', 'Anand', 'Krishnan', '23B95A0512', 'Civil Engineering', 2, 'D'],
    ['13', 'varun.bhat@student.com', 'Varun', 'Bhat', '22B95A0513', 'Computer Science', 3, 'D'],
    ['14', 'manish.dubey@student.com', 'Manish', 'Dubey', '21B95A0514', 'Electrical Engineering', 4, 'D'],
    ['15', 'tushar.pandey@student.com', 'Tushar', 'Pandey', '23B95A0515', 'Mechanical Engineering', 2, 'B'],
    ['16', 'ravi.yadav@student.com', 'Ravi', 'Yadav', '22B95A0516', 'Information Technology', 3, 'E'],
    ['17', 'gaurav.mishra@student.com', 'Gaurav', 'Mishra', '24B95A0517', 'Computer Science', 1, 'E'],
    ['18', 'akash.shah@student.com', 'Akash', 'Shah', '23B95A0518', 'Civil Engineering', 2, 'B'],
    ['19', 'chetan.patil@student.com', 'Chetan', 'Patil', '22B95A0519', 'Electrical Engineering', 3, 'E'],
    ['20', 'neeraj.kulkarni@student.com', 'Neeraj', 'Kulkarni', '21B95A0520', 'Mechanical Engineering', 4, 'B'],
    ['21', 'punit.iyer@student.com', 'Punit', 'Iyer', '23B95A0521', 'Computer Science', 2, 'E'],
    ['22', 'sajal.bose@student.com', 'Sajal', 'Bose', '24B95A0522', 'Information Technology', 1, 'B'],
    ['23', 'harshit.sinha@student.com', 'Harshit', 'Sinha', '22B95A0523', 'Civil Engineering', 3, 'E'],
    ['24', 'yash.agarwal@student.com', 'Yash', 'Agarwal', '21B95A0524', 'Computer Science', 4, 'E'],
    ['25', 'devendra.tiwari@student.com', 'Devendra', 'Tiwari', '24B95A0525', 'Mechanical Engineering', 1, 'C'],
    ['26', 'kartik.rawat@student.com', 'Kartik', 'Rawat', '23B95A0526', 'Electrical Engineering', 2, 'C'],
    ['27', 'shreyas.pillai@student.com', 'Shreyas', 'Pillai', '22B95A0527', 'Computer Science', 3, 'C'],
    ['28', 'mohit.bansal@student.com', 'Mohit', 'Bansal', '21B95A0528', 'Information Technology', 4, 'C'],
    ['29', 'vivek.das@student.com', 'Vivek', 'Das', '24B95A0529', 'Civil Engineering', 1, 'B'],
    ['30', 'abhishek.dixit@student.com', 'Abhishek', 'Dixit', '23B95A0530', 'Mechanical Engineering', 2, 'B'],
    ['31', 'sachin.kaushik@student.com', 'Sachin', 'Kaushik', '22B95A0531', 'Computer Science', 3, 'B'],
    ['32', 'sameer.malik@student.com', 'Sameer', 'Malik', '24B95A0532', 'Electrical Engineering', 1, 'B'],
    ['33', 'nitish.roy@student.com', 'Nitish', 'Roy', '21B95A0533', 'Information Technology', 4, 'A'],
    ['34', 'lalit.meena@student.com', 'Lalit', 'Meena', '23B95A0534', 'Computer Science', 2, 'A'],
    ['35', 'deepesh.tripathi@student.com', 'Deepesh', 'Tripathi', '22B95A0535', 'Civil Engineering', 3, 'A'],
    ['36', 'kunal.saxena@student.com', 'Kunal', 'Saxena', '21B95A0536', 'Mechanical Engineering', 4, 'A'],
    ['37', 'himanshu.bajpai@student.com', 'Himanshu', 'Bajpai', '24B95A0537', 'Computer Science', 1, 'C'],
    ['38', 'aman.chaudhary@student.com', 'Aman', 'Chaudhary', '23B95A0538', 'Electrical Engineering', 2, 'D'],
    ['39', 'rajat.goyal@student.com', 'Rajat', 'Goyal', '22B95A0539', 'Information Technology', 3, 'D'],
    ['40', 'shiv.kapoor@student.com', 'Shiv', 'Kapoor', '21B95A0540', 'Computer Science', 4, 'C'],
  ];

  const users = [
    { id: 'u-admin-1', email: 'admin@hostelsync.com', passwordHash: adminHash, role: 'ADMIN', isActive: true, createdAt: new Date() },
    { id: 'u-manage-1', email: 'management@hostelsync.com', passwordHash: manageHash, role: 'MANAGEMENT', isActive: true, createdAt: new Date() },
    ...studentData.map(([n, email]) => ({
      id: `u-s-${n}`,
      email,
      passwordHash: studHash,
      role: 'STUDENT',
      isActive: true,
      createdAt: new Date(),
    })),
  ];

  // ============================================================
  // STUDENT PROFILES
  // ============================================================
  const PHONES = [
    '+91 98765 43200', '+91 98765 43201', '+91 98765 43202', '+91 98765 43203',
    '+91 98765 43204', '+91 98765 43205', '+91 98765 43206', '+91 98765 43207',
    '+91 98765 43208', '+91 98765 43209', '+91 98765 43210', '+91 98765 43211',
    '+91 98765 43212', '+91 98765 43213', '+91 98765 43214', '+91 98765 43215',
    '+91 98765 43216', '+91 98765 43217', '+91 98765 43218', '+91 98765 43219',
    '+91 98765 43220', '+91 98765 43221', '+91 98765 43222', '+91 98765 43223',
    '+91 98765 43224', '+91 98765 43225', '+91 98765 43226', '+91 98765 43227',
    '+91 98765 43228', '+91 98765 43229', '+91 98765 43230', '+91 98765 43231',
    '+91 98765 43232', '+91 98765 43233', '+91 98765 43234', '+91 98765 43235',
    '+91 98765 43236', '+91 98765 43237', '+91 98765 43238', '+91 98765 43239',
  ];

  const studentProfiles = studentData.map(([n, , first, last, regNo, dept, yr], idx) => ({
    id: `sp-${n}`,
    userId: `u-s-${n}`,
    firstName: first,
    lastName: last,
    studentId: regNo,
    department: dept,
    year: yr,
    gender: 'MALE',
    phone: PHONES[idx] || '+91 99999 00000',
    profileComplete: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // ============================================================
  // PREFERENCES  (all 40 students, varied archetypes)
  // ============================================================
  const preferences = studentData.map(([n, , , , , , , archetype], idx) => ({
    id: `pref-${n}`,
    studentProfileId: `sp-${n}`,
    ...makePrefs(ARCHETYPES[archetype], idx),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // ============================================================
  // ROOMS — 55 rooms, ALL MALE
  //
  // Per floor: 11 rooms
  //   Floor 1: 101–111 → 101–107 = 4-sharing, 108–111 = 5-sharing
  //   Floor 2: 201–211 → 201–204 = 5-sharing, 205–211 = 4-sharing
  //   Floor 3: 301–311 → 301–307 = 4-sharing, 308–311 = 5-sharing
  //   Floor 4: 401–411 → 401–404 = 5-sharing, 405–411 = 4-sharing
  //   Floor 5: 501–511 → 501–507 = 4-sharing, 508–511 = 5-sharing
  //
  // Total 4-sharing: 7+7+7+7+7 = 35 ✓
  // Total 5-sharing: 4+4+4+4+4 = 20 ✓
  // Total rooms = 55 ✓
  // Total capacity = (35 × 4) + (20 × 5) = 140 + 100 = 240 beds ✓
  // ============================================================
  const desc4 = 'Four-sharing room with attached bathroom';
  const desc5 = 'Five-sharing room with attached bathroom';

  function room(id, number, cap, floor, building, description) {
    return { id, number, capacity: cap, gender: 'MALE', floor, building, status: 'AVAILABLE', description, hasAttachedBathroom: true, createdAt: new Date(), updatedAt: new Date() };
  }

  const rooms = [
    // ── FLOOR 1 ──────────────────────────────────────────────
    room('rm-101', '101', 4, 1, 'Block A', desc4),
    room('rm-102', '102', 4, 1, 'Block A', desc4),
    room('rm-103', '103', 4, 1, 'Block A', desc4),
    room('rm-104', '104', 4, 1, 'Block A', desc4),
    room('rm-105', '105', 5, 1, 'Block A', desc5), // 5th room: 5-sharing
    room('rm-106', '106', 5, 1, 'Block A', desc5), // 6th room: 5-sharing
    room('rm-107', '107', 4, 1, 'Block A', desc4),
    room('rm-108', '108', 5, 1, 'Block A', desc5), // 8th room: 5-sharing
    room('rm-109', '109', 4, 1, 'Block A', desc4),
    room('rm-110', '110', 4, 1, 'Block A', desc4),
    room('rm-111', '111', 5, 1, 'Block A', desc5), // 11th room: 5-sharing
    // ── FLOOR 2 ──────────────────────────────────────────────
    room('rm-201', '201', 4, 2, 'Block A', desc4),
    room('rm-202', '202', 4, 2, 'Block A', desc4),
    room('rm-203', '203', 4, 2, 'Block A', desc4),
    room('rm-204', '204', 4, 2, 'Block A', desc4),
    room('rm-205', '205', 5, 2, 'Block A', desc5), // 5th room: 5-sharing
    room('rm-206', '206', 5, 2, 'Block A', desc5), // 6th room: 5-sharing
    room('rm-207', '207', 4, 2, 'Block A', desc4),
    room('rm-208', '208', 5, 2, 'Block A', desc5), // 8th room: 5-sharing
    room('rm-209', '209', 4, 2, 'Block A', desc4),
    room('rm-210', '210', 4, 2, 'Block A', desc4),
    room('rm-211', '211', 5, 2, 'Block A', desc5), // 11th room: 5-sharing
    // ── FLOOR 3 ──────────────────────────────────────────────
    room('rm-301', '301', 4, 3, 'Block B', desc4),
    room('rm-302', '302', 4, 3, 'Block B', desc4),
    room('rm-303', '303', 4, 3, 'Block B', desc4),
    room('rm-304', '304', 4, 3, 'Block B', desc4),
    room('rm-305', '305', 5, 3, 'Block B', desc5), // 5th room: 5-sharing
    room('rm-306', '306', 5, 3, 'Block B', desc5), // 6th room: 5-sharing
    room('rm-307', '307', 4, 3, 'Block B', desc4),
    room('rm-308', '308', 5, 3, 'Block B', desc5), // 8th room: 5-sharing
    room('rm-309', '309', 4, 3, 'Block B', desc4),
    room('rm-310', '310', 4, 3, 'Block B', desc4),
    room('rm-311', '311', 5, 3, 'Block B', desc5), // 11th room: 5-sharing
    // ── FLOOR 4 ──────────────────────────────────────────────
    room('rm-401', '401', 4, 4, 'Block B', desc4),
    room('rm-402', '402', 4, 4, 'Block B', desc4),
    room('rm-403', '403', 4, 4, 'Block B', desc4),
    room('rm-404', '404', 4, 4, 'Block B', desc4),
    room('rm-405', '405', 5, 4, 'Block B', desc5), // 5th room: 5-sharing
    room('rm-406', '406', 5, 4, 'Block B', desc5), // 6th room: 5-sharing
    room('rm-407', '407', 4, 4, 'Block B', desc4),
    room('rm-408', '408', 5, 4, 'Block B', desc5), // 8th room: 5-sharing
    room('rm-409', '409', 4, 4, 'Block B', desc4),
    room('rm-410', '410', 4, 4, 'Block B', desc4),
    room('rm-411', '411', 5, 4, 'Block B', desc5), // 11th room: 5-sharing
    // ── FLOOR 5 ──────────────────────────────────────────────
    room('rm-501', '501', 4, 5, 'Block C', desc4),
    room('rm-502', '502', 4, 5, 'Block C', desc4),
    room('rm-503', '503', 4, 5, 'Block C', desc4),
    room('rm-504', '504', 4, 5, 'Block C', desc4),
    room('rm-505', '505', 5, 5, 'Block C', desc5), // 5th room: 5-sharing
    room('rm-506', '506', 5, 5, 'Block C', desc5), // 6th room: 5-sharing
    room('rm-507', '507', 4, 5, 'Block C', desc4),
    room('rm-508', '508', 5, 5, 'Block C', desc5), // 8th room: 5-sharing
    room('rm-509', '509', 4, 5, 'Block C', desc4),
    room('rm-510', '510', 4, 5, 'Block C', desc4),
    room('rm-511', '511', 5, 5, 'Block C', desc5), // 11th room: 5-sharing
  ];

  // ============================================================
  // MATCHING RUNS (seed data has 1 completed run)
  // ============================================================
  const matchingRuns = [
    {
      id: 'run-seed-1',
      status: 'COMPLETED',
      totalStudents: 40,
      totalRooms: 55,
      studentsAssigned: 40,
      studentsUnassigned: 0,
      avgCompatibility: 89.4,
      algorithmVersion: '1.0.0',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ];

  // ============================================================
  // ALLOCATIONS — 40 students placed in rooms (MALE ONLY)
  // ============================================================
  const alloc = (id, roomId, studentProfileId) => ({
    id, roomId, studentProfileId, matchingRunId: 'run-seed-1',
    status: 'CONFIRMED', createdAt: new Date(), updatedAt: new Date(),
  });

  const roomAllocations = [
    // Floor 1 — room 101 (2/4)
    alloc('al-001', 'rm-101', 'sp-01'),
    alloc('al-002', 'rm-101', 'sp-02'),
    // Floor 1 — room 102 (4/4 FULL)
    alloc('al-003', 'rm-102', 'sp-03'),
    alloc('al-004', 'rm-102', 'sp-04'),
    alloc('al-005', 'rm-102', 'sp-05'),
    alloc('al-006', 'rm-102', 'sp-06'),
    // Floor 1 — room 103 (3/4)
    alloc('al-007', 'rm-103', 'sp-07'),
    alloc('al-008', 'rm-103', 'sp-08'),
    alloc('al-009', 'rm-103', 'sp-09'),
    // Floor 1 — room 104 (1/4)
    alloc('al-010', 'rm-104', 'sp-10'),
    // Floor 1 — room 107 (4/4 FULL)
    alloc('al-011', 'rm-107', 'sp-11'),
    alloc('al-012', 'rm-107', 'sp-12'),
    alloc('al-013', 'rm-107', 'sp-13'),
    alloc('al-014', 'rm-107', 'sp-14'),
    // Floor 1 — room 108 (5/5 FULL)
    alloc('al-015', 'rm-108', 'sp-15'),
    alloc('al-016', 'rm-108', 'sp-16'),
    alloc('al-017', 'rm-108', 'sp-17'),
    alloc('al-018', 'rm-108', 'sp-18'),
    alloc('al-019', 'rm-108', 'sp-19'),
    // Floor 1 — room 109 (3/5)
    alloc('al-020', 'rm-109', 'sp-20'),
    alloc('al-021', 'rm-109', 'sp-21'),
    alloc('al-022', 'rm-109', 'sp-22'),
    // Floor 1 — room 110 (2/5)
    alloc('al-023', 'rm-110', 'sp-23'),
    alloc('al-024', 'rm-110', 'sp-24'),
    // Floor 2 — room 201 (4/5)
    alloc('al-025', 'rm-201', 'sp-25'),
    alloc('al-026', 'rm-201', 'sp-26'),
    alloc('al-027', 'rm-201', 'sp-27'),
    alloc('al-028', 'rm-201', 'sp-28'),
    // Floor 2 — room 202 (3/5)
    alloc('al-029', 'rm-202', 'sp-29'),
    alloc('al-030', 'rm-202', 'sp-30'),
    alloc('al-031', 'rm-202', 'sp-31'),
    // Floor 2 — room 203 (1/5)
    alloc('al-032', 'rm-203', 'sp-32'),
    // Floor 2 — room 205 (2/4)
    alloc('al-033', 'rm-205', 'sp-33'),
    alloc('al-034', 'rm-205', 'sp-34'),
    // Floor 2 — room 206 (4/4 FULL)
    alloc('al-035', 'rm-206', 'sp-35'),
    alloc('al-036', 'rm-206', 'sp-36'),
    alloc('al-037', 'rm-206', 'sp-37'),
    alloc('al-038', 'rm-206', 'sp-38'),
    // Floor 2 — room 207 (2/4)
    alloc('al-039', 'rm-207', 'sp-39'),
    alloc('al-040', 'rm-207', 'sp-40'),
  ];

  // ============================================================
  // COMPATIBILITY SCORES — Calculated dynamically from actual student preferences
  // ============================================================
  const { calculateCompatibility } = require('../services/compatibility');

  const compatibilityScores = [];
  let csIdx = 1;
  for (const r of rooms) {
    const allocs = roomAllocations.filter(a => a.roomId === r.id);
    for (let i = 0; i < allocs.length; i++) {
      for (let j = i + 1; j < allocs.length; j++) {
        const p1 = preferences.find(p => p.studentProfileId === allocs[i].studentProfileId);
        const p2 = preferences.find(p => p.studentProfileId === allocs[j].studentProfileId);
        if (p1 && p2) {
          const comp = calculateCompatibility(
            { ...p1, studentProfileId: p1.studentProfileId },
            { ...p2, studentProfileId: p2.studentProfileId }
          );
          compatibilityScores.push({
            id: `cs-${String(csIdx++).padStart(3, '0')}`,
            studentAId: p1.studentProfileId,
            studentBId: p2.studentProfileId,
            score: comp.score,
            lifestyleScore: comp.lifestyleScore,
            studyScore: comp.studyScore,
            cleanlinessScore: comp.cleanlinessScore,
            socialScore: comp.socialScore,
            boundaryScore: comp.boundaryScore,
            hardConflict: comp.hardConflict || false,
            conflictReason: comp.conflictReason || null,
            matchingRunId: 'run-seed-1',
            createdAt: new Date(),
          });
        }
      }
    }
  }

  // ============================================================
  // FEEDBACK
  // ============================================================
  const feedbacks = [
    {
      id: 'fb-01', studentProfileId: 'sp-01', roomAllocationId: 'al-001',
      overallSatisfaction: 5, cleanlinessScore: 5, studyCompatibility: 5,
      lifestyleCompatibility: 5, noiseCompatibility: 5, wouldChooseAgain: true,
      conflictExperienced: false, comment: 'Great roommate match! Sleep schedules aligned perfectly.', createdAt: new Date(),
    },
    {
      id: 'fb-02', studentProfileId: 'sp-03', roomAllocationId: 'al-003',
      overallSatisfaction: 5, cleanlinessScore: 5, studyCompatibility: 5,
      lifestyleCompatibility: 4, noiseCompatibility: 5, wouldChooseAgain: true,
      conflictExperienced: false, comment: 'Excellent match. Everyone in the room is disciplined and clean.', createdAt: new Date(),
    },
    {
      id: 'fb-03', studentProfileId: 'sp-11', roomAllocationId: 'al-011',
      overallSatisfaction: 4, cleanlinessScore: 5, studyCompatibility: 5,
      lifestyleCompatibility: 4, noiseCompatibility: 4, wouldChooseAgain: true,
      conflictExperienced: false, comment: 'Good match. Study hours are compatible.', createdAt: new Date(),
    },
    {
      id: 'fb-04', studentProfileId: 'sp-07', roomAllocationId: 'al-007',
      overallSatisfaction: 4, cleanlinessScore: 3, studyCompatibility: 4,
      lifestyleCompatibility: 4, noiseCompatibility: 4, wouldChooseAgain: true,
      conflictExperienced: false, comment: 'Night owls together — works well!', createdAt: new Date(),
    },
  ];

  return {
    users,
    studentProfiles,
    preferences,
    rooms,
    matchingRuns,
    roomAllocations,
    compatibilityScores,
    feedbacks,
    conflicts: [],
  };
}

module.exports = { generateInitialData };
