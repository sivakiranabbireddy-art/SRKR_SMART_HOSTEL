const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function updateRegisterNumbers() {
    console.log("=================================================");
    console.log("🔍 HOSTELSYNC REGISTER NUMBER MIGRATION PRE-CHECK");
    console.log("=================================================");

    const joiningYear = "2026";
    const yearPrefix = joiningYear.slice(-2); // "26"
    const formatDescription = `[LAST TWO DIGITS (${yearPrefix})] + B95A0 + [3-DIGIT NUMBER (001-120)]`;

    console.log(`📌 Joining Year: ${joiningYear} (Prefix: ${yearPrefix})`);
    console.log(`📌 Generated Format: ${formatDescription}`);
    console.log(`📌 Format Pattern: ${yearPrefix}B95A0xxx (e.g. ${yearPrefix}B95A001)\n`);

    // 1. Fetch all student profiles
    let allProfiles = [];
    try {
        allProfiles = await prisma.studentProfile.findMany({
            select: {
                id: true,
                studentId: true,
                firstName: true,
                lastName: true,
                userId: true,
            },
            orderBy: {
                studentId: 'asc'
            }
        });
    } catch (err) {
        console.error("❌ Failed to query database:", err.message);
        process.exit(1);
    }

    console.log(`📊 Total Student Profiles in DB: ${allProfiles.length}`);

    // 2. Find target mock student profiles (either MOCK2026xxx or 26B95A00xx)
    const targetProfiles = allProfiles.filter(p => 
        /^MOCK2026\d{3}$/.test(p.studentId) || /^26B95A00\d{2,3}$/.test(p.studentId) || /^26B95A0\d{3}$/.test(p.studentId)
    );
    console.log(`🎯 Mock students identified for update: ${targetProfiles.length}/120\n`);

    if (targetProfiles.length === 0) {
        console.log("ℹ️ No target mock students found.");
        return;
    }

    // 3. Build target mappings (exact format: 26B95A001 ... 26B95A120)
    // Sort target profiles deterministically
    targetProfiles.sort((a, b) => {
        const numA = parseInt(a.studentId.replace(/\D/g, '').slice(-3), 10);
        const numB = parseInt(b.studentId.replace(/\D/g, '').slice(-3), 10);
        return numA - numB;
    });

    const mappings = [];
    for (let i = 1; i <= targetProfiles.length; i++) {
        const paddedNum = String(i).padStart(3, "0");
        const profile = targetProfiles[i - 1];
        const oldId = profile.studentId;
        const newId = `${yearPrefix}B95A${paddedNum}`; // Yields 26B95A001 ... 26B95A120
        mappings.push({ index: i, profileId: profile.id, oldId, newId, name: `${profile.firstName} ${profile.lastName}` });
    }

    console.log("📋 First 10 Old → New Mappings:");
    mappings.slice(0, 10).forEach(m => {
        console.log(`   ${m.oldId}  ➔  ${m.newId}`);
    });
    console.log("   ...");
    console.log(`   ${mappings[119].oldId}  ➔  ${mappings[119].newId}\n`);

    // 4. Pre-check: Check all 120 new register numbers are unique
    const newIdSet = new Set(mappings.map(m => m.newId));
    if (newIdSet.size !== 120) {
        console.error("❌ CRITICAL: Generated new register numbers contain duplicates! Aborting.");
        process.exit(1);
    }
    console.log("✅ Pre-check 1: All 120 new register numbers are unique.");

    // 5. Pre-check: Check if any new register number already exists in StudentProfile for other students
    const existingStudentIdMap = new Map(allProfiles.map(p => [p.studentId, p]));
    const nonMockStudentProfiles = allProfiles.filter(p => !/^MOCK2026\d{3}$/.test(p.studentId));
    const nonMockIdSet = new Set(nonMockStudentProfiles.map(p => p.studentId));

    const conflicts = [];
    for (const m of mappings) {
        if (nonMockIdSet.has(m.newId)) {
            conflicts.push({
                newId: m.newId,
                existingStudent: existingStudentIdMap.get(m.newId)
            });
        }
    }

    if (conflicts.length > 0) {
        console.error("❌ CONFLICT DETECTED! The following new register numbers already exist for other students:");
        conflicts.forEach(c => {
            console.error(`   Conflict: ${c.newId} is already assigned to ${c.existingStudent.firstName} ${c.existingStudent.lastName}`);
        });
        console.error("🛑 Aborting migration to prevent overwriting existing students.");
        process.exit(1);
    }
    console.log("✅ Pre-check 2: Zero conflicts found. No other students have these IDs.");
    console.log("✅ Pre-check 3: Ready to execute atomic transaction.\n");

    // 6. Execute atomic transaction
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
        console.log("🎉 TRANSACTION COMPLETED SUCCESSFULLY");
        console.log("=================================================");
        console.log(`✅ Number of students updated: ${results.length}`);
        console.log(`✅ Conflicts: 0`);
        console.log(`✅ Existing real students: Untouched`);
        console.log(`\n📋 First 10 Updated Records in DB:`);
        results.slice(0, 10).forEach((p, idx) => {
            console.log(`   ${idx + 1}. Old: ${mappings[idx].oldId}  ➔  New: ${p.studentId} (${p.firstName} ${p.lastName})`);
        });
        console.log("=================================================");
    } catch (txErr) {
        console.error("❌ Transaction failed! Rolling back all changes:", txErr.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

updateRegisterNumbers();
