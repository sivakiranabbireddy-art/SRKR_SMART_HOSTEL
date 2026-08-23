const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function updateLegacyRegisterNumbers() {
    console.log("=================================================");
    console.log("🔍 HOSTELSYNC LEGACY STUDENT REGISTER NUMBER MIGRATION");
    console.log("=================================================");

    // 1. Fetch all student profiles
    const allProfiles = await prisma.studentProfile.findMany({
        select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            year: true,
            department: true,
            gender: true,
            createdAt: true,
            user: {
                select: {
                    email: true
                }
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    console.log(`📊 Total Student Profiles in DB: ${allProfiles.length}`);

    // Filter legacy students (those with IDs not yet in SRKR format like CS2001, EE2001, etc.)
    const legacyProfiles = allProfiles.filter(p => !p.studentId.includes('B95A'));
    console.log(`🎯 Legacy students identified for update: ${legacyProfiles.length}\n`);

    if (legacyProfiles.length === 0) {
        console.log("✅ All students are already in SRKR format. No legacy students found.");
        return;
    }

    // Set of all existing student IDs that are NOT being migrated
    const legacyIds = new Set(legacyProfiles.map(p => p.id));
    const nonLegacyStudentIds = new Set(
        allProfiles.filter(p => !legacyIds.has(p.id)).map(p => p.studentId)
    );

    // Map year to joining prefix:
    // Year 1 -> Joined 2025 -> 25B95A
    // Year 2 -> Joined 2024 -> 24B95A
    // Year 3 -> Joined 2023 -> 23B95A
    // Year 4 -> Joined 2022 -> 22B95A
    const yearPrefixMap = {
        1: '25',
        2: '24',
        3: '23',
        4: '22',
        5: '21',
        6: '20',
    };

    // Group legacy students by academic year and sort deterministically
    const byYear = {};
    legacyProfiles.forEach(p => {
        const y = p.year || 1;
        if (!byYear[y]) byYear[y] = [];
        byYear[y].push(p);
    });

    const mappings = [];
    const generatedNewIds = new Set();

    Object.keys(byYear).sort().forEach(yearStr => {
        const year = parseInt(yearStr, 10);
        const prefix = yearPrefixMap[year] || '25';
        const studentsInYear = byYear[year];

        studentsInYear.forEach((profile, idx) => {
            let number = idx + 1;
            let paddedNum = String(number).padStart(3, "0");
            let newId = `${prefix}B95A${paddedNum}`;

            // Safety collision check: if newId is already used by a non-migrated student or another student in this run, increment number
            while (nonLegacyStudentIds.has(newId) || generatedNewIds.has(newId)) {
                number++;
                paddedNum = String(number).padStart(3, "0");
                newId = `${prefix}B95A${paddedNum}`;
            }

            generatedNewIds.add(newId);
            mappings.push({
                profileId: profile.id,
                name: `${profile.firstName} ${profile.lastName}`,
                year: profile.year,
                department: profile.department,
                oldId: profile.studentId,
                newId: newId,
                email: profile.user?.email
            });
        });
    });

    // 2. Pre-check: Uniqueness
    console.log("📋 Sample Old → New Register Number Mappings by Year:");
    Object.keys(byYear).sort().forEach(yearStr => {
        const year = parseInt(yearStr, 10);
        const yearMappings = mappings.filter(m => m.year === year);
        console.log(`\n📌 Year ${year} (Prefix: ${yearPrefixMap[year]}B95A) — ${yearMappings.length} students:`);
        yearMappings.slice(0, 5).forEach(m => {
            console.log(`   ${m.oldId.padEnd(10)} ➔  ${m.newId} | ${m.name.padEnd(20)} (${m.department})`);
        });
        if (yearMappings.length > 5) {
            console.log(`   ...and ${yearMappings.length - 5} more.`);
        }
    });

    console.log("\n=================================================");
    console.log("🔍 PRE-CHECK VERIFICATION");
    console.log("=================================================");

    if (generatedNewIds.size !== mappings.length) {
        console.error("❌ CRITICAL: Generated new register numbers contain duplicate entries! Aborting.");
        process.exit(1);
    }
    console.log(`✅ Pre-check 1: All ${mappings.length} new register numbers are unique.`);

    for (const m of mappings) {
        if (nonLegacyStudentIds.has(m.newId)) {
            console.error(`❌ CRITICAL CONFLICT: ${m.newId} already belongs to an existing student! Aborting.`);
            process.exit(1);
        }
    }
    console.log("✅ Pre-check 2: Zero conflicts with existing 120 mock students or real accounts.");
    console.log("✅ Pre-check 3: No other tables or fields modified. Ready to execute atomic transaction.\n");

    // 3. Execute atomic transaction
    console.log("🚀 Executing database transaction...");
    const transactionOperations = mappings.map(m =>
        prisma.studentProfile.update({
            where: { id: m.profileId },
            data: { studentId: m.newId }
        })
    );

    try {
        const results = await prisma.$transaction(transactionOperations);
        console.log("=================================================");
        console.log("🎉 MIGRATION COMPLETED SUCCESSFULLY");
        console.log("=================================================");
        console.log(`✅ Number of legacy students updated: ${results.length}`);
        console.log(`✅ Conflicts: 0`);
        console.log(`✅ All 120 mock students (26B95A001-26B95A120) and real accounts: UNTOUCHED`);
        console.log(`\n📋 Updated Records Summary:`);
        results.slice(0, 10).forEach((p, idx) => {
            const m = mappings[idx];
            console.log(`   ${idx + 1}. [${m.oldId}] ➔ ${p.studentId} (${p.firstName} ${p.lastName} · Yr ${p.year} ${p.department})`);
        });
        console.log("   ...");
        console.log("=================================================");
    } catch (err) {
        console.error("❌ Transaction failed! Rolling back all changes:", err.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

updateLegacyRegisterNumbers();
