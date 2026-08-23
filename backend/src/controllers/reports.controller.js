const prisma = require('../lib/prisma');

const getOverview = async (req, res, next) => {
  try {
    const [
      totalStudents,
      totalRooms,
      totalFeedback,
      latestRun,
      allFeedback,
    ] = await Promise.all([
      prisma.studentProfile.count(),
      prisma.room.count(),
      prisma.feedback.count(),
      prisma.matchingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { createdAt: 'desc' } }),
      prisma.feedback.findMany({
        select: {
          overallSatisfaction: true,
          cleanlinessScore: true,
          studyCompatibility: true,
          lifestyleCompatibility: true,
          noiseCompatibility: true,
          wouldChooseAgain: true,
          conflictExperienced: true,
        },
      }),
    ]);

    const avgStats = allFeedback.length > 0 ? {
      overallSatisfaction: allFeedback.reduce((a, f) => a + f.overallSatisfaction, 0) / allFeedback.length,
      cleanliness: allFeedback.reduce((a, f) => a + f.cleanlinessScore, 0) / allFeedback.length,
      study: allFeedback.reduce((a, f) => a + f.studyCompatibility, 0) / allFeedback.length,
      lifestyle: allFeedback.reduce((a, f) => a + f.lifestyleCompatibility, 0) / allFeedback.length,
      noise: allFeedback.reduce((a, f) => a + f.noiseCompatibility, 0) / allFeedback.length,
      wouldChooseAgainRate: (allFeedback.filter(f => f.wouldChooseAgain).length / allFeedback.length) * 100,
      conflictRate: (allFeedback.filter(f => f.conflictExperienced).length / allFeedback.length) * 100,
    } : null;

    res.json({
      totalStudents,
      totalRooms,
      totalFeedback,
      latestRun,
      avgStats,
    });
  } catch (error) { next(error); }
};

const getSummaryReport = async (req, res, next) => {
  try {
    const [
      totalStudents,
      completedPrefs,
      totalRooms,
      rooms,
      latestRun,
      students,
    ] = await Promise.all([
      prisma.studentProfile.count(),
      prisma.preference.count({ where: { isComplete: true } }),
      prisma.room.count(),
      prisma.room.findMany({
        include: {
          allocations: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } },
        },
      }),
      prisma.matchingRun.findFirst({ where: { status: 'COMPLETED' }, orderBy: { createdAt: 'desc' } }),
      prisma.studentProfile.findMany({ select: { department: true } }),
    ]);

    // Department grouping
    const deptMap = {};
    students.forEach(s => {
      const dept = s.department || 'Other';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });
    const byDepartment = Object.entries(deptMap).map(([department, count]) => ({
      department,
      count,
    }));

    // Capacity vs Occupied
    const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
    const totalOccupied = rooms.reduce((acc, r) => acc + r.allocations.length, 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
    const completionRate = totalStudents > 0 ? Math.round((completedPrefs / totalStudents) * 100) : 0;

    let compatibility = {
      excellent: 0,
      veryGood: 0,
      good: 0,
      moderate: 0,
      poor: 0,
    };

    if (latestRun) {
      const scores = await prisma.compatibilityScore.findMany({
        where: { matchingRunId: latestRun.id, score: { gte: 0 } },
        select: { score: true },
      });

      compatibility = {
        excellent: scores.filter(s => s.score >= 90).length,
        veryGood: scores.filter(s => s.score >= 75 && s.score < 90).length,
        good: scores.filter(s => s.score >= 60 && s.score < 75).length,
        moderate: scores.filter(s => s.score >= 40 && s.score < 60).length,
        poor: scores.filter(s => s.score < 40).length,
      };
    }

    res.json({
      totalStudents,
      completionRate,
      avgCompatibility: latestRun?.avgCompatibility ? Number(latestRun.avgCompatibility).toFixed(1) : null,
      occupancyRate,
      byDepartment,
      compatibility,
    });
  } catch (error) { next(error); }
};

const getCompatibilityReport = async (req, res, next) => {
  try {
    const latestRun = await prisma.matchingRun.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestRun) {
      return res.json({ distribution: [], avgCompatibility: null });
    }

    const scores = await prisma.compatibilityScore.findMany({
      where: { matchingRunId: latestRun.id, score: { gte: 0 } },
      select: { score: true },
    });

    const distribution = {
      excellent: scores.filter(s => s.score >= 90).length,
      veryGood: scores.filter(s => s.score >= 75 && s.score < 90).length,
      good: scores.filter(s => s.score >= 60 && s.score < 75).length,
      moderate: scores.filter(s => s.score >= 40 && s.score < 60).length,
      poor: scores.filter(s => s.score < 40).length,
    };

    const avgCompatibility = scores.length > 0
      ? scores.reduce((a, s) => a + s.score, 0) / scores.length
      : null;

    res.json({ distribution, avgCompatibility, totalPairs: scores.length, runId: latestRun.id });
  } catch (error) { next(error); }
};

const getFeedbackReport = async (req, res, next) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      include: {
        studentProfile: { select: { firstName: true, lastName: true, studentId: true, department: true } },
        roomAllocation: { include: { room: { select: { number: true, building: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      total: feedbacks.length,
      avgOverall: feedbacks.length ? feedbacks.reduce((a, f) => a + f.overallSatisfaction, 0) / feedbacks.length : 0,
      conflictCount: feedbacks.filter(f => f.conflictExperienced).length,
      wouldChooseAgainCount: feedbacks.filter(f => f.wouldChooseAgain).length,
    };

    // Department breakdown
    const deptMap = {};
    feedbacks.forEach(f => {
      const dept = f.studentProfile.department;
      if (!deptMap[dept]) deptMap[dept] = { total: 0, satisfaction: 0 };
      deptMap[dept].total++;
      deptMap[dept].satisfaction += f.overallSatisfaction;
    });
    const departmentStats = Object.entries(deptMap).map(([dept, stat]) => ({
      department: dept,
      count: stat.total,
      avgSatisfaction: Math.round((stat.satisfaction / stat.total) * 100) / 100,
    }));

    res.json({ feedbacks, summary, departmentStats });
  } catch (error) { next(error); }
};

module.exports = { getOverview, getSummaryReport, getCompatibilityReport, getFeedbackReport };
