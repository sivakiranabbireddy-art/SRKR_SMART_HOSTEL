const prisma = require('../lib/prisma');

const getManagementDashboard = async (req, res, next) => {
  try {
    const [
      totalStudents,
      totalRooms,
      rooms,
      latestRun,
      allFeedback,
    ] = await Promise.all([
      prisma.studentProfile.count(),
      prisma.room.count(),
      prisma.room.findMany({
        include: {
          allocations: {
            where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          },
        },
      }),
      prisma.matchingRun.findFirst({
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feedback.findMany({
        select: {
          overallSatisfaction: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const roomOccupancy = rooms.map(r => ({
      id: r.id,
      number: r.number,
      capacity: r.capacity,
      occupied: r.allocations.length,
      gender: r.gender,
      floor: r.floor,
      building: r.building,
    }));

    const roomsFilled = roomOccupancy.filter(r => r.occupied >= r.capacity).length;

    const avgSatisfaction = allFeedback.length > 0
      ? Math.round((allFeedback.reduce((a, f) => a + f.overallSatisfaction, 0) / allFeedback.length) * 10) / 10
      : null;

    // Group feedback by month/date for trend line
    const trendMap = {};
    allFeedback.forEach(f => {
      const dateKey = new Date(f.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      if (!trendMap[dateKey]) trendMap[dateKey] = { sum: 0, count: 0 };
      trendMap[dateKey].sum += f.overallSatisfaction;
      trendMap[dateKey].count++;
    });

    const feedbackTrend = Object.entries(trendMap).map(([date, data]) => ({
      date,
      avgSatisfaction: Math.round((data.sum / data.count) * 10) / 10,
    }));

    res.json({
      totalStudents,
      totalRooms,
      roomsFilled,
      avgCompatibility: latestRun?.avgCompatibility ? Number(latestRun.avgCompatibility).toFixed(1) : null,
      avgSatisfaction,
      roomOccupancy,
      feedbackTrend,
    });
  } catch (error) { next(error); }
};

const getManagementRooms = async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        allocations: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          select: { id: true },
        },
      },
      orderBy: [{ building: 'asc' }, { floor: 'asc' }, { number: 'asc' }],
    });

    const formatted = rooms.map(r => {
      const occupiedCount = r.allocations.length;
      const availableBeds = r.capacity - occupiedCount;
      const occupancyPercentage = r.capacity > 0 ? Math.round((occupiedCount / r.capacity) * 100) : 0;
      let status = 'EMPTY';
      if (occupiedCount >= r.capacity) status = 'FULL';
      else if (occupiedCount > 0) status = 'PARTIAL';
      return {
        id: r.id,
        number: r.number,
        capacity: r.capacity,
        occupiedCount,
        availableBeds,
        occupancyPercentage,
        gender: r.gender,
        floor: r.floor,
        building: r.building,
        status,
        description: r.description || null,
        hasAttachedBathroom: r.hasAttachedBathroom !== undefined ? r.hasAttachedBathroom : true,
      };
    });

    res.json({ rooms: formatted });
  } catch (error) { next(error); }
};

module.exports = {
  getManagementDashboard,
  getManagementRooms,
};
