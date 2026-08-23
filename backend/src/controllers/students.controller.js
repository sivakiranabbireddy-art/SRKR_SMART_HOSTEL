const prisma = require('../lib/prisma');
const { calculateCompatibility } = require('../services/compatibility');

const getMyProfile = async (req, res, next) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
      include: { preference: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (error) { next(error); }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, avatarUrl, department, year, gender } = req.body;
    const profile = await prisma.studentProfile.update({
      where: { userId: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(department && { department }),
        ...(year && { year: parseInt(year) }),
        ...(gender && { gender }),
      },
    });
    res.json(profile);
  } catch (error) { next(error); }
};

const getMyMatches = async (req, res, next) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Get latest matching run
    const latestRun = await prisma.matchingRun.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestRun) {
      return res.json({ matches: [], message: 'No matching has been run yet.' });
    }

    // Get compatibility scores for this student
    const scores = await prisma.compatibilityScore.findMany({
      where: {
        matchingRunId: latestRun.id,
        OR: [
          { studentAId: profile.id },
          { studentBId: profile.id },
        ],
        hardConflict: false,
        score: { gte: 0 },
      },
      orderBy: { score: 'desc' },
      take: 10,
    });

    // Fetch peer profiles (hide sensitive preference details)
    const matches = await Promise.all(
      scores.map(async (score) => {
        const peerId = score.studentAId === profile.id ? score.studentBId : score.studentAId;
        const peer = await prisma.studentProfile.findUnique({
          where: { id: peerId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            year: true,
            gender: true,
            avatarUrl: true,
          },
        });
        return {
          student: peer,
          compatibility: {
            score: score.score,
            lifestyleScore: score.lifestyleScore,
            studyScore: score.studyScore,
            cleanlinessScore: score.cleanlinessScore,
            socialScore: score.socialScore,
            boundaryScore: score.boundaryScore,
          },
        };
      })
    );

    res.json({ matches, matchingRunId: latestRun.id });
  } catch (error) { next(error); }
};

const getMyRoom = async (req, res, next) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const allocation = await prisma.roomAllocation.findFirst({
      where: {
        studentProfileId: profile.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        room: true,
        matchingRun: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!allocation) {
      return res.json({ allocation: null, message: 'No room allocation found.' });
    }

    // Get roommates (same room, same matching run)
    const roommateAllocations = await prisma.roomAllocation.findMany({
      where: {
        roomId: allocation.roomId,
        matchingRunId: allocation.matchingRunId,
        studentProfileId: { not: profile.id },
      },
      include: {
        studentProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            year: true,
            gender: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Calculate true group compatibility for all students in this room
    const allStudentIds = [profile.id, ...roommateAllocations.map(r => r.studentProfileId)];
    let roomCompatibility = null;
    if (allStudentIds.length >= 2) {
      const roomPrefs = await prisma.preference.findMany({
        where: { studentProfileId: { in: allStudentIds } },
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
      if (pairCount > 0) {
        roomCompatibility = Math.round(pairTotal / pairCount);
      }
    }

    res.json({
      allocation: {
        id: allocation.id,
        status: allocation.status,
        confirmedAt: allocation.confirmedAt,
        room: allocation.room,
        matchingRun: allocation.matchingRun,
        roommates: roommateAllocations.map(r => r.studentProfile),
        roomCompatibility,
      },
    });
  } catch (error) { next(error); }
};

const submitFeedback = async (req, res, next) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const {
      roomAllocationId,
      overallSatisfaction,
      cleanlinessScore,
      studyCompatibility,
      lifestyleCompatibility,
      noiseCompatibility,
      wouldChooseAgain,
      conflictExperienced,
      comment,
    } = req.body;

    // Verify the allocation belongs to this student
    const allocation = await prisma.roomAllocation.findFirst({
      where: { id: roomAllocationId, studentProfileId: profile.id },
    });
    if (!allocation) return res.status(403).json({ error: 'Allocation not found or access denied.' });

    // Check for duplicate feedback
    const existing = await prisma.feedback.findFirst({
      where: { studentProfileId: profile.id, roomAllocationId },
    });
    if (existing) return res.status(409).json({ error: 'Feedback already submitted for this allocation.' });

    const feedback = await prisma.feedback.create({
      data: {
        studentProfileId: profile.id,
        roomAllocationId,
        overallSatisfaction: parseInt(overallSatisfaction),
        cleanlinessScore: parseInt(cleanlinessScore),
        studyCompatibility: parseInt(studyCompatibility),
        lifestyleCompatibility: parseInt(lifestyleCompatibility),
        noiseCompatibility: parseInt(noiseCompatibility),
        wouldChooseAgain: Boolean(wouldChooseAgain),
        conflictExperienced: Boolean(conflictExperienced),
        comment: comment || null,
      },
    });

    res.status(201).json({ feedback, message: 'Feedback submitted successfully.' });
  } catch (error) { next(error); }
};

module.exports = { getMyProfile, updateMyProfile, getMyMatches, getMyRoom, submitFeedback };
