const { PrismaClient } = require("@prisma/client");
const { HOBBIES_DATABASE, getRandomHobbies } = require("../src/constants/hobbies");

const prisma = new PrismaClient();

async function populateStudentHobbies() {
    console.log("=================================================");
    console.log("🎯 POPULATING RANDOM HOBBIES IN DATABASE");
    console.log("=================================================");

    const allPreferences = await prisma.preference.findMany({
        include: {
            studentProfile: {
                select: {
                    id: true,
                    studentId: true,
                    firstName: true,
                    lastName: true,
                    gender: true,
                }
            }
        }
    });

    console.log(`📊 Total Student Preferences found in DB: ${allPreferences.length}`);

    if (allPreferences.length === 0) {
        console.log("No preferences found in DB.");
        return;
    }

    let updatedCount = 0;
    const updates = [];

    for (let i = 0; i < allPreferences.length; i++) {
        const pref = allPreferences[i];
        // Generate 3 to 5 unique random hobbies
        const count = 3 + (i % 3); // 3, 4, or 5 hobbies
        const randomHobbies = getRandomHobbies(count);

        updates.push(
            prisma.preference.update({
                where: { id: pref.id },
                data: {
                    hobbies: randomHobbies,
                }
            })
        );
    }

    console.log(`🚀 Updating ${updates.length} student preference records with random hobbies...`);
    const results = await prisma.$transaction(updates);

    console.log(`✅ Successfully updated ${results.length} student profiles with random hobbies!`);

    // Verify and display sample of 10 updated students
    const sample = await prisma.preference.findMany({
        take: 10,
        include: {
            studentProfile: {
                select: {
                    studentId: true,
                    firstName: true,
                    lastName: true,
                }
            }
        }
    });

    console.log("\n📋 Sample of 10 Updated Student Records:");
    sample.forEach((s, idx) => {
        const name = `${s.studentProfile?.firstName} ${s.studentProfile?.lastName}`;
        const id = s.studentProfile?.studentId || 'N/A';
        console.log(`   ${idx + 1}. [${id}] ${name.padEnd(22)} ➔ Hobbies: ${JSON.stringify(s.hobbies)}`);
    });

    console.log("=================================================");
    await prisma.$disconnect();
}

populateStudentHobbies().catch(err => {
    console.error("❌ Error populating hobbies:", err);
    process.exit(1);
});
