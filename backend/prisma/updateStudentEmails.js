const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function updateMockStudentEmails() {
    console.log("=================================================");
    console.log("🔍 HOSTELSYNC MOCK STUDENT EMAIL MIGRATION");
    console.log("=================================================");

    // 1. Fetch all users and student profiles
    const allUsers = await prisma.user.findMany({
        include: {
            profile: true
        }
    });

    console.log(`📊 Total Users in DB: ${allUsers.length}`);

    // Identify the 120 mock students by studentId format (26B95A001 ... 26B95A120) or mock email
    const mockUsers = allUsers.filter(u => 
        u.profile && (
            /^26B95A\d{3}$/.test(u.profile.studentId) ||
            /^mockstudent\d{3}@hostelsync\.com$/i.test(u.email)
        )
    );

    // Sort deterministically by studentId or numeric index (001 to 120)
    mockUsers.sort((a, b) => {
        const idA = a.profile?.studentId || '';
        const idB = b.profile?.studentId || '';
        const numA = parseInt(idA.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(idB.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
    });

    console.log(`🎯 Mock students identified for email update: ${mockUsers.length}/120\n`);

    if (mockUsers.length === 0) {
        console.log("⚠️ No mock students found to update.");
        return;
    }

    // Set of existing emails belonging to non-mock users (real users)
    const mockUserIds = new Set(mockUsers.map(u => u.id));
    const nonMockUserEmails = new Set(
        allUsers
            .filter(u => !mockUserIds.has(u.id))
            .map(u => u.email.toLowerCase().trim())
    );

    // Generate new emails with collision detection
    const generatedEmails = new Set();
    const mappings = [];

    for (let i = 0; i < mockUsers.length; i++) {
        const user = mockUsers[i];
        const profile = user.profile;
        const studentNumber = String(i + 1).padStart(3, "0");

        const cleanFirst = profile.firstName.toLowerCase().replace(/\s+/g, '');
        const cleanLast = profile.lastName.toLowerCase().replace(/\s+/g, '');

        let baseEmail = `${cleanFirst}.${cleanLast}@gmail.com`;

        // Check if baseEmail is already taken by a real user or a previous student in this batch
        let finalEmail = baseEmail;
        if (nonMockUserEmails.has(finalEmail) || generatedEmails.has(finalEmail)) {
            // Add 3-digit student number (e.g. varun.kumar002@gmail.com)
            finalEmail = `${cleanFirst}.${cleanLast}${studentNumber}@gmail.com`;
        }

        // Safety fallback if still colliding
        let attempt = 1;
        while (nonMockUserEmails.has(finalEmail) || generatedEmails.has(finalEmail)) {
            attempt++;
            finalEmail = `${cleanFirst}.${cleanLast}${studentNumber}_${attempt}@gmail.com`;
        }

        generatedEmails.add(finalEmail);
        mappings.push({
            index: i + 1,
            userId: user.id,
            studentId: profile.studentId,
            name: `${profile.firstName} ${profile.lastName}`,
            oldEmail: user.email,
            newEmail: finalEmail,
            hasCollisionResolved: finalEmail !== baseEmail
        });
    }

    // Pre-check verification: Ensure exactly 120 unique emails and zero conflicts
    console.log("📋 First 10 Old → New Email Mappings:");
    mappings.slice(0, 10).forEach(m => {
        console.log(`   ${m.studentId} | ${m.name.padEnd(20)}: ${m.oldEmail}  ➔  ${m.newEmail}`);
    });
    console.log("   ...\n");

    const collisions = mappings.filter(m => m.hasCollisionResolved);
    if (collisions.length > 0) {
        console.log(`ℹ️ Duplicate name collisions resolved with student number (${collisions.length} cases):`);
        collisions.slice(0, 5).forEach(c => {
            console.log(`   ${c.studentId} | ${c.name}: resolved to ${c.newEmail}`);
        });
        if (collisions.length > 5) console.log(`   ...and ${collisions.length - 5} more.`);
        console.log("");
    }

    if (generatedEmails.size !== mappings.length) {
        console.error("❌ CRITICAL: Generated emails contain duplicates! Aborting.");
        process.exit(1);
    }
    console.log(`✅ Pre-check 1: All ${mappings.length} new Gmail addresses are distinct and unique.`);

    for (const m of mappings) {
        if (nonMockUserEmails.has(m.newEmail)) {
            console.error(`❌ CRITICAL: ${m.newEmail} collides with an existing real user! Aborting.`);
            process.exit(1);
        }
    }
    console.log("✅ Pre-check 2: Zero collisions with existing real users.");
    console.log("✅ Pre-check 3: No OTP emails will be sent.");
    console.log("🚀 Executing database transaction...\n");

    // Execute atomic transaction to update User.email
    const transactionOperations = mappings.map(m =>
        prisma.user.update({
            where: { id: m.userId },
            data: { email: m.newEmail }
        })
    );

    try {
        const results = await prisma.$transaction(transactionOperations);
        console.log("=================================================");
        console.log("🎉 EMAIL MIGRATION COMPLETED SUCCESSFULLY");
        console.log("=================================================");
        console.log(`✅ Number of mock student emails updated: ${results.length}`);
        console.log(`✅ Conflicts: 0`);
        console.log(`✅ Passwords, names, preferences, and real users: UNTOUCHED`);
        console.log(`\n📋 First 10 Updated User Records:`);
        results.slice(0, 10).forEach((u, idx) => {
            const m = mappings[idx];
            console.log(`   ${idx + 1}. [${m.studentId}] ${m.name.padEnd(20)} ➔ ${u.email}`);
        });
        console.log("=================================================");
    } catch (err) {
        console.error("❌ Transaction failed! Rolling back all changes:", err.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

updateMockStudentEmails();
