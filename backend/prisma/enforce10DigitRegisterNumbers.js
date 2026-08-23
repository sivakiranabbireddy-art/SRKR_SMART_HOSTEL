const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function enforce10DigitRegisterNumbers() {
    console.log("=================================================");
    console.log("🔍 ENFORCING 10-CHARACTER SRKR REGISTER NUMBERS");
    console.log("=================================================");

    const allProfiles = await prisma.studentProfile.findMany({
        select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            year: true,
            department: true,
            user: {
                select: {
                    email: true
                }
            }
        },
        orderBy: {
            studentId: 'asc'
        }
    });

    console.log(`📊 Total Student Profiles in DB: ${allProfiles.length}`);

    // Find all profiles where studentId is not 10 characters
    const non10Profiles = allProfiles.filter(p => p.studentId.length !== 10);
    const existing10Profiles = allProfiles.filter(p => p.studentId.length === 10);
    const existing10Ids = new Set(existing10Profiles.map(p => p.studentId.toUpperCase()));

    console.log(`📌 Already 10 characters: ${existing10Profiles.length}`);
    console.log(`🎯 Need update to 10 characters: ${non10Profiles.length}\n`);

    if (non10Profiles.length === 0) {
        console.log("✅ All student registration numbers are already exactly 10 characters!");
        return;
    }

    const mappings = [];
    const newIdSet = new Set(existing10Ids);

    for (const p of non10Profiles) {
        let newId = p.studentId;

        // If format is like 26B95A001 (9 chars: 2-digit yr + B95A + 3-digit num)
        const match = p.studentId.match(/^(\d{2}B95A)(\d{3})$/i);
        if (match) {
            const prefix = match[1].toUpperCase();
            const num = match[2];
            // Format to 4-digit zero-padded number so total length is 2 + 4 + 4 = 10 chars
            newId = `${prefix}0${num}`; // e.g. 26B95A0001
        } else if (p.studentId.length < 10) {
            // General padding if necessary
            const prefix = p.studentId.slice(0, 6);
            const suffix = p.studentId.slice(6);
            newId = `${prefix}${suffix.padStart(4, '0')}`;
        }

        // Collision safety check
        if (newIdSet.has(newId)) {
            console.error(`❌ CONFLICT DETECTED: ${newId} is already in use!`);
            process.exit(1);
        }

        newIdSet.add(newId);
        mappings.push({
            profileId: p.id,
            oldId: p.studentId,
            newId: newId,
            name: `${p.firstName} ${p.lastName}`
        });
    }

    console.log("📋 First 15 Old (9 chars) → New (10 chars) Mappings:");
    mappings.slice(0, 15).forEach((m, idx) => {
        console.log(`   ${idx + 1}. ${m.oldId.padEnd(12)} (len: ${m.oldId.length}) ➔  ${m.newId} (len: ${m.newId.length}) | ${m.name}`);
    });
    console.log("   ...");
    console.log(`   ${mappings[mappings.length - 1].oldId.padEnd(12)} (len: ${mappings[mappings.length - 1].oldId.length}) ➔  ${mappings[mappings.length - 1].newId} (len: ${mappings[mappings.length - 1].newId.length}) | ${mappings[mappings.length - 1].name}\n`);

    // Verify all generated IDs are exactly 10 characters
    const invalidLength = mappings.filter(m => m.newId.length !== 10);
    if (invalidLength.length > 0) {
        console.error("❌ CRITICAL: Some generated IDs do not have length 10:", invalidLength);
        process.exit(1);
    }
    console.log(`✅ Pre-check 1: All ${mappings.length} new IDs have length EXACTLY 10.`);
    console.log(`✅ Pre-check 2: All ${newIdSet.size} total student IDs across database are unique and 10 characters.`);

    // Execute atomic transaction
    console.log("🚀 Executing database transaction...");
    const operations = mappings.map(m =>
        prisma.studentProfile.update({
            where: { id: m.profileId },
            data: { studentId: m.newId }
        })
    );

    try {
        const results = await prisma.$transaction(operations);
        console.log("=================================================");
        console.log("🎉 10-CHARACTER MIGRATION COMPLETED SUCCESSFULLY");
        console.log("=================================================");
        console.log(`✅ Total students updated to 10 characters: ${results.length}`);
        console.log(`✅ Total students in DB: ${allProfiles.length}`);
        console.log("=================================================");
    } catch (err) {
        console.error("❌ Transaction failed! Rolling back:", err.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

enforce10DigitRegisterNumbers();
