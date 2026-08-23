const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function convertFemaleToMale() {
    console.log("=================================================");
    console.log("🔄 CONVERTING ALL FEMALE MEMBERS & ROOMS TO MALE");
    console.log("=================================================");

    // 1. Fetch all female students
    const femaleStudents = await prisma.studentProfile.findMany({
        where: {
            gender: { in: ["FEMALE", "female", "Female"] }
        },
        include: { user: true }
    });

    console.log(`👩 Found ${femaleStudents.length} female student profiles in DB.`);

    // 2. Fetch all existing user emails to avoid collisions
    const allUsers = await prisma.user.findMany({ select: { email: true } });
    const existingEmails = new Set(allUsers.map(u => u.email.toLowerCase()));

    const studentUpdates = [];

    for (const student of femaleStudents) {
        // Clean first and last names for email formatting
        const cleanFirst = student.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanLast = student.lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        let targetEmail = `${cleanFirst}.${cleanLast}@gmail.com`;

        // If targetEmail is already taken by a DIFFERENT user, append numeric suffix
        if (existingEmails.has(targetEmail) && student.user?.email.toLowerCase() !== targetEmail) {
            const studentNumMatch = student.studentId.match(/\d+$/);
            const suffix = studentNumMatch ? studentNumMatch[0].slice(-3) : '001';
            targetEmail = `${cleanFirst}.${cleanLast}${suffix}@gmail.com`;
        }

        // Keep track of new email in set
        existingEmails.delete(student.user?.email.toLowerCase());
        existingEmails.add(targetEmail);

        console.log(`   ➔ [${student.studentId}] ${student.firstName} ${student.lastName}: Gender FEMALE ➔ MALE | Email: ${student.user?.email} ➔ ${targetEmail}`);

        // Update StudentProfile gender to MALE
        studentUpdates.push(
            prisma.studentProfile.update({
                where: { id: student.id },
                data: { gender: "MALE" }
            })
        );

        // Update User email
        if (student.userId) {
            studentUpdates.push(
                prisma.user.update({
                    where: { id: student.userId },
                    data: { email: targetEmail }
                })
            );
        }
    }

    if (studentUpdates.length > 0) {
        await prisma.$transaction(studentUpdates);
        console.log(`✅ Successfully updated ${femaleStudents.length} students to MALE with updated emails!`);
    }

    // 3. Fetch and update all female rooms to MALE
    const femaleRooms = await prisma.room.findMany({
        where: {
            gender: { in: ["FEMALE", "female", "Female"] }
        }
    });

    console.log(`\n🏢 Found ${femaleRooms.length} female rooms in DB.`);
    
    if (femaleRooms.length > 0) {
        const roomUpdateResult = await prisma.room.updateMany({
            where: {
                gender: { in: ["FEMALE", "female", "Female"] }
            },
            data: {
                gender: "MALE"
            }
        });
        console.log(`✅ Successfully updated ${roomUpdateResult.count} rooms to MALE!`);
    }

    // 4. Verification
    const remainingFemaleStudents = await prisma.studentProfile.count({
        where: { gender: { in: ["FEMALE", "female", "Female"] } }
    });
    const remainingFemaleRooms = await prisma.room.count({
        where: { gender: { in: ["FEMALE", "female", "Female"] } }
    });

    const totalStudents = await prisma.studentProfile.count();
    const totalMaleStudents = await prisma.studentProfile.count({ where: { gender: "MALE" } });
    const totalRooms = await prisma.room.count();
    const totalMaleRooms = await prisma.room.count({ where: { gender: "MALE" } });

    console.log("\n📊 Final Verification Summary:");
    console.log(`   - Total Students: ${totalStudents} (Male: ${totalMaleStudents}, Female: ${remainingFemaleStudents})`);
    console.log(`   - Total Rooms: ${totalRooms} (Male: ${totalMaleRooms}, Female: ${remainingFemaleRooms})`);
    console.log("=================================================");

    await prisma.$disconnect();
}

convertFemaleToMale().catch(err => {
    console.error("❌ Error converting female to male:", err);
    process.exit(1);
});
