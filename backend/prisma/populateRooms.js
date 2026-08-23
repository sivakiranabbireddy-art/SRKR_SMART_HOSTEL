const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function populateHostelRooms() {
    console.log("=================================================");
    console.log("🏢 POPULATING HOSTEL ROOMS (BLOCKS A, B, C)");
    console.log("=================================================");

    const roomsToCreate = [];

    // Block A: Boys Hostel (Floors 1 to 4, 10 rooms per floor = 40 rooms * 4 capacity = 160 capacity)
    for (let floor = 1; floor <= 4; floor++) {
        for (let roomNum = 1; roomNum <= 10; roomNum++) {
            const numStr = `A-${floor}${String(roomNum).padStart(2, '0')}`;
            roomsToCreate.push({
                number: numStr,
                capacity: 4,
                gender: "MALE",
                floor: floor,
                building: "Block A",
                status: "AVAILABLE",
            });
        }
    }

    // Block B: Boys Hostel (Floors 1 to 2, 5 rooms per floor = 10 rooms * 4 capacity = 40 capacity)
    for (let floor = 1; floor <= 2; floor++) {
        for (let roomNum = 1; roomNum <= 5; roomNum++) {
            const numStr = `B-${floor}${String(roomNum).padStart(2, '0')}`;
            roomsToCreate.push({
                number: numStr,
                capacity: 4,
                gender: "MALE",
                floor: floor,
                building: "Block B",
                status: "AVAILABLE",
            });
        }
    }

    // Block C: Mixed / Additional Boys Hostel (Floors 1 to 2, 5 rooms per floor = 10 rooms * 4 capacity = 40 capacity)
    for (let floor = 1; floor <= 2; floor++) {
        for (let roomNum = 1; roomNum <= 5; roomNum++) {
            const numStr = `C-${floor}${String(roomNum).padStart(2, '0')}`;
            roomsToCreate.push({
                number: numStr,
                capacity: 4,
                gender: "MALE",
                floor: floor,
                building: "Block C",
                status: "AVAILABLE",
            });
        }
    }

    console.log(`📋 Total rooms to ensure in DB: ${roomsToCreate.length} (Total capacity: ${roomsToCreate.reduce((a, b) => a + b.capacity, 0)})`);

    let created = 0;
    let existing = 0;

    for (const r of roomsToCreate) {
        const found = await prisma.room.findUnique({
            where: { number: r.number }
        });

        if (!found) {
            await prisma.room.create({ data: r });
            created++;
        } else {
            // Update to standard 4-capacity and status AVAILABLE
            await prisma.room.update({
                where: { id: found.id },
                data: {
                    capacity: r.capacity,
                    gender: r.gender,
                    floor: r.floor,
                    building: r.building,
                    status: "AVAILABLE"
                }
            });
            existing++;
        }
    }

    console.log(`✅ Newly created: ${created} rooms`);
    console.log(`🔄 Updated/Verified: ${existing} rooms`);

    const allRooms = await prisma.room.findMany();
    const totalCap = allRooms.reduce((acc, r) => acc + r.capacity, 0);
    const maleCap = allRooms.filter(r => r.gender === 'MALE').reduce((acc, r) => acc + r.capacity, 0);
    const femaleCap = allRooms.filter(r => r.gender === 'FEMALE').reduce((acc, r) => acc + r.capacity, 0);

    console.log("\n📊 Hostels Capacity Summary:");
    console.log(`   - Total Rooms: ${allRooms.length}`);
    console.log(`   - Total Bed Capacity: ${totalCap}`);
    console.log(`   - Male Bed Capacity: ${maleCap}`);
    console.log(`   - Female Bed Capacity: ${femaleCap}`);
    console.log("=================================================");

    await prisma.$disconnect();
}

populateHostelRooms().catch(err => {
    console.error("❌ Error populating rooms:", err);
    process.exit(1);
});
