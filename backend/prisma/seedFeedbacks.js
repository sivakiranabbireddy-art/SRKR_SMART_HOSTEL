const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const FEEDBACK_COMMENTS = [
    "Roommates are extremely supportive and we have similar study schedules. Perfect matching!",
    "Very satisfied with room cleanliness and quiet study hours. Great room allocation.",
    "Great roommates, we share similar interests in competitive coding and badminton.",
    "Living together is peaceful. Sleeping and waking schedules match perfectly.",
    "Good room environment, everyone respects personal boundaries and quiet hours.",
    "We formed a great study group in our room for semester exams. Loving the hostel life!",
    "Room is well-ventilated and roommates are friendly, cooperative, and tidy.",
    "No complaints at all, highly compatible routines and respectful roommates.",
    "Overall good experience! Weekend sleep times vary slightly, but we coordinate well.",
    "Roommates are friendly. We set up a mutual light-out schedule that works great for all.",
    "Good overall. Sometimes calls during study hours get a bit noisy, but easily manageable.",
    "Cleanliness is well-maintained. We made a weekly chore rotation schedule.",
    "Very disciplined roommates. Great environment for GATE and placement preparations.",
    "Comfortable stay so far. Everyone is polite and shares responsibilities evenly.",
    "Super happy with the room pairing! We share common interests in tech and gaming.",
    "Respectful roommates with quiet study habits. Would definitely choose to room together again."
];

async function seedFeedbacks() {
    console.log("=================================================");
    console.log("📝 SEEDING RANDOM STUDENT ROOM FEEDBACKS");
    console.log("=================================================");

    // 1. Fetch existing confirmed/pending allocations with student profiles and rooms
    const allocations = await prisma.roomAllocation.findMany({
        where: {
            status: { in: ["PENDING", "CONFIRMED"] }
        },
        include: {
            studentProfile: true,
            room: true
        }
    });

    console.log(`📊 Found ${allocations.length} active room allocations.`);

    if (allocations.length === 0) {
        console.log("No room allocations found to attach feedbacks to.");
        return;
    }

    // Clear previous feedbacks
    await prisma.feedback.deleteMany({});
    console.log("🧹 Cleared old feedback records.");

    // Pick 45 random allocations to have submitted feedback
    const shuffled = [...allocations].sort(() => 0.5 - Math.random());
    const selectedAllocations = shuffled.slice(0, Math.min(48, allocations.length));

    const feedbackInserts = [];

    for (let i = 0; i < selectedAllocations.length; i++) {
        const alloc = selectedAllocations[i];
        
        // Distribution of satisfaction: mostly 4s and 5s with some 3s
        const randType = i % 10;
        let overall = 4;
        let clean = 4;
        let study = 4;
        let life = 4;
        let noise = 4;
        let wouldAgain = true;
        let hadConflict = false;

        if (randType <= 4) {
            // Excellent (5/5)
            overall = 5;
            clean = Math.random() > 0.3 ? 5 : 4;
            study = 5;
            life = 5;
            noise = Math.random() > 0.4 ? 5 : 4;
            wouldAgain = true;
            hadConflict = false;
        } else if (randType <= 8) {
            // Very Good (4/5)
            overall = 4;
            clean = 4;
            study = 4;
            life = Math.random() > 0.5 ? 4 : 5;
            noise = Math.random() > 0.5 ? 4 : 3;
            wouldAgain = true;
            hadConflict = false;
        } else {
            // Moderate (3/5)
            overall = 3;
            clean = 3;
            study = 3;
            life = 3;
            noise = 3;
            wouldAgain = Math.random() > 0.5;
            hadConflict = Math.random() > 0.5;
        }

        const comment = FEEDBACK_COMMENTS[i % FEEDBACK_COMMENTS.length];
        // Spread timestamps across the last 14 days
        const daysAgo = (i % 14) + 1;
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 3600000);

        feedbackInserts.push({
            studentProfileId: alloc.studentProfileId,
            roomAllocationId: alloc.id,
            overallSatisfaction: overall,
            cleanlinessScore: clean,
            studyCompatibility: study,
            lifestyleCompatibility: life,
            noiseCompatibility: noise,
            wouldChooseAgain: wouldAgain,
            conflictExperienced: hadConflict,
            comment: comment,
            createdAt: createdAt,
            updatedAt: createdAt
        });
    }

    console.log(`🚀 Creating ${feedbackInserts.length} feedback records...`);
    await prisma.feedback.createMany({
        data: feedbackInserts
    });

    console.log(`✅ Successfully seeded ${feedbackInserts.length} student feedback entries!`);

    // Verify sample
    const sample = await prisma.feedback.findMany({
        take: 8,
        include: {
            studentProfile: {
                select: { firstName: true, lastName: true, studentId: true }
            },
            roomAllocation: {
                include: { room: { select: { number: true } } }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    console.log("\n📋 Sample of Submitted Student Feedbacks:");
    sample.forEach((fb, idx) => {
        const student = `${fb.studentProfile?.firstName} ${fb.studentProfile?.lastName} (${fb.studentProfile?.studentId})`;
        const room = fb.roomAllocation?.room?.number || 'N/A';
        console.log(`   ${idx + 1}. [Room ${room}] ${student.padEnd(30)} ⭐ ${fb.overallSatisfaction}/5 Stars`);
        console.log(`      ➔ "${fb.comment}"`);
        console.log(`      ➔ Clean: ${fb.cleanlinessScore}/5 | Study: ${fb.studyCompatibility}/5 | Noise: ${fb.noiseCompatibility}/5 | Would Choose Again: ${fb.wouldChooseAgain ? 'Yes' : 'No'}\n`);
    });

    console.log("=================================================");
    await prisma.$disconnect();
}

seedFeedbacks().catch(err => {
    console.error("❌ Error seeding feedbacks:", err);
    process.exit(1);
});
