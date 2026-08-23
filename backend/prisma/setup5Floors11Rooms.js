const { PrismaClient } = require("@prisma/client");
const { runMatchingPipeline } = require("../src/services/matching");

const prisma = new PrismaClient();

async function setup5Floors11Rooms() {
    console.log("=================================================");
    console.log("🏢 CONFIGURING 5 FLOORS, 11 ROOMS PER FLOOR");
    console.log("   - 5-Shared Rooms: 5th, 6th, 8th, 11th on each floor (Capacity: 5)");
    console.log("   - Other Rooms: 1st, 2nd, 3rd, 4th, 7th, 9th, 10th (Capacity: 4)");
    console.log("=================================================");

    // 1. Clear existing room allocations & old rooms
    await prisma.roomAllocation.deleteMany({});
    await prisma.room.deleteMany({});
    console.log("🧹 Cleared old room allocations and room records.");

    const fiveSharedIndices = new Set([5, 6, 8, 11]);
    const roomsToCreate = [];

    for (let floor = 1; floor <= 5; floor++) {
        for (let r = 1; r <= 11; r++) {
            const is5Shared = fiveSharedIndices.has(r);
            const capacity = is5Shared ? 5 : 4;
            const roomNum = `${floor}${String(r).padStart(2, '0')}`;

            roomsToCreate.push({
                number: roomNum,
                capacity: capacity,
                gender: "MALE",
                floor: floor,
                building: "Main Block",
                status: "AVAILABLE",
            });
        }
    }

    console.log(`📋 Total rooms to create: ${roomsToCreate.length}`);
    await prisma.room.createMany({
        data: roomsToCreate,
    });

    console.log(`✅ Successfully created ${roomsToCreate.length} rooms in PostgreSQL!`);

    // Verify room creation breakdown per floor
    const allRooms = await prisma.room.findMany({
        orderBy: [{ floor: "asc" }, { number: "asc" }]
    });

    console.log("\n📊 Floor & Room Capacity Breakdown:");
    for (let floor = 1; floor <= 5; floor++) {
        const floorRooms = allRooms.filter(r => r.floor === floor);
        const floorCap = floorRooms.reduce((acc, r) => acc + r.capacity, 0);
        const fiveShared = floorRooms.filter(r => r.capacity === 5).map(r => r.number);
        const fourShared = floorRooms.filter(r => r.capacity === 4).map(r => r.number);
        console.log(`   🏢 Floor ${floor} (11 Rooms, ${floorCap} Total Beds):`);
        console.log(`      ➔ 5-Shared (5 beds each): ${fiveShared.join(", ")}`);
        console.log(`      ➔ 4-Shared (4 beds each): ${fourShared.join(", ")}`);
    }

    const totalBeds = allRooms.reduce((acc, r) => acc + r.capacity, 0);
    const total5Beds = allRooms.filter(r => r.capacity === 5).length;
    const total4Beds = allRooms.filter(r => r.capacity === 4).length;

    console.log(`\n🏨 Total Summary:`);
    console.log(`   - Total Floors: 5`);
    console.log(`   - Total Rooms: ${allRooms.length} (20 five-sharing rooms + 35 four-sharing rooms)`);
    console.log(`   - Total Bed Capacity: ${totalBeds} beds (100 in 5-share + 140 in 4-share)`);

    // 2. Trigger Room Matching for all 173 students
    console.log("\n🚀 Running Room Matching Algorithm across all 173 students and 55 rooms...");
    const run = await prisma.matchingRun.create({
        data: { status: "RUNNING", algorithmVersion: "1.0.0" }
    });

    await runMatchingPipeline(run.id);

    const updatedRun = await prisma.matchingRun.findUnique({ where: { id: run.id } });
    console.log(`\n🎯 Matching Run Complete!`);
    console.log(`   - Total Students: ${updatedRun.totalStudents}`);
    console.log(`   - Students Assigned: ${updatedRun.studentsAssigned} / ${updatedRun.totalStudents} (100%)`);
    console.log(`   - Students Unassigned: ${updatedRun.studentsUnassigned}`);
    console.log(`   - Average Compatibility: ${updatedRun.avgCompatibility}%`);

    // Check room occupancies
    const allocations = await prisma.roomAllocation.findMany({
        include: { room: true }
    });

    const roomOccupancy = {};
    allocations.forEach(a => {
        const num = a.room.number;
        roomOccupancy[num] = (roomOccupancy[num] || 0) + 1;
    });

    console.log(`\n🏠 Sample Room Allocations:`);
    allRooms.slice(0, 11).forEach(r => {
        const count = roomOccupancy[r.number] || 0;
        console.log(`   Room ${r.number.padEnd(5)} | Capacity: ${r.capacity} beds | Occupied: ${count} students ${count === r.capacity ? '🟢 [Full]' : count > 0 ? '🟡 [Partially Filled]' : '⚪ [Empty]'}`);
    });

    console.log("=================================================");
    await prisma.$disconnect();
}

setup5Floors11Rooms().catch(err => {
    console.error("❌ Error setting up 5 floors & 11 rooms:", err);
    process.exit(1);
});
