const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fillMissingData() {
    console.log("=================================================");
    console.log("🔍 CHECKING AND FILLING MISSING STUDENT DATA");
    console.log("=================================================");

    const profiles = await prisma.studentProfile.findMany({
        include: {
            user: true,
            preference: true
        }
    });

    console.log(`📊 Total Student Profiles: ${profiles.length}`);

    let missingPhoneCount = 0;
    let missingPrefCount = 0;
    const updates = [];

    for (let i = 0; i < profiles.length; i++) {
        const p = profiles[i];
        let needsUpdate = false;
        let newPhone = p.phone;

        if (!p.phone || p.phone.trim() === '') {
            missingPhoneCount++;
            needsUpdate = true;
            // Generate standard 10-digit phone number
            newPhone = `98${String(10000000 + i)}`;
        }

        if (needsUpdate) {
            updates.push(
                prisma.studentProfile.update({
                    where: { id: p.id },
                    data: {
                        phone: newPhone
                    }
                })
            );
        }
    }

    console.log(`ℹ️ Profiles missing phone numbers: ${missingPhoneCount}`);

    if (updates.length > 0) {
        console.log(`🚀 Updating ${updates.length} student profiles...`);
        await prisma.$transaction(updates);
        console.log(`✅ All missing student phone numbers populated successfully!`);
    } else {
        console.log(`✅ No missing phone numbers found.`);
    }

    // Verify all profiles now have complete data
    const updatedProfiles = await prisma.studentProfile.findMany({
        select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            phone: true,
            department: true,
            year: true,
            gender: true,
            user: {
                select: {
                    email: true
                }
            }
        }
    });

    const stillMissing = updatedProfiles.filter(p => !p.phone || !p.studentId || !p.user?.email);
    console.log(`\n📊 Verification check: ${stillMissing.length} profiles with missing critical fields.`);
    console.log("=================================================");
    console.log("Sample of first 5 student profiles:");
    updatedProfiles.slice(0, 5).forEach((p, idx) => {
        console.log(`  ${idx + 1}. [${p.studentId}] ${p.firstName} ${p.lastName} | Phone: ${p.phone} | Email: ${p.user?.email}`);
    });
    console.log("=================================================");

    await prisma.$disconnect();
}

fillMissingData();
