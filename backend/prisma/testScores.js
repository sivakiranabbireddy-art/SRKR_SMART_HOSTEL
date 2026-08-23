const prisma = require("../src/lib/prisma");
const { runMatchingPipeline } = require("../src/services/matching");

async function testMatching() {
    const run = await prisma.matchingRun.create({
        data: { status: "RUNNING", algorithmVersion: "1.0.0" }
    });
    console.log("Starting matching run:", run.id);
    await runMatchingPipeline(run.id);

    const updatedRun = await prisma.matchingRun.findUnique({ where: { id: run.id } });
    console.log(`\n🎯 Matching Run Complete: Overall Allocated Avg Compatibility = ${updatedRun.avgCompatibility}%`);

    const allocations = await prisma.roomAllocation.findMany({
        include: { room: true, studentProfile: true }
    });
    console.log(`✅ Total Students Assigned to Rooms: ${allocations.length}`);

    const scores = await prisma.compatibilityScore.findMany({
        where: { matchingRunId: run.id },
        include: {
            studentA: { select: { studentId: true, firstName: true, lastName: true } },
            studentB: { select: { studentId: true, firstName: true, lastName: true } }
        }
    });

    console.log(`📊 Total Pairwise Compatibility Scores Saved in DB: ${scores.length}`);
    const scoreValues = scores.map(s => s.score);
    const min = Math.min(...scoreValues);
    const max = Math.max(...scoreValues);
    const avg = (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(1);

    console.log(`\n📈 Compatibility Score Spread: Min = ${min}%, Max = ${max}%, Avg = ${avg}%`);

    console.log("\n📋 Sample Pairwise Roommate Compatibility Scores Across Different Pairs:");
    scores.slice(0, 15).forEach((s, idx) => {
        const a = `${s.studentA?.firstName} ${s.studentA?.lastName} (${s.studentA?.studentId})`;
        const b = `${s.studentB?.firstName} ${s.studentB?.lastName} (${s.studentB?.studentId})`;
        console.log(`   ${idx + 1}. ${a.padEnd(30)} ⚡  ${b.padEnd(30)}`);
        console.log(`      ➔ Total Score: ${s.score}% | Lifestyle: ${s.lifestyleScore}% | Study: ${s.studyScore}% | Clean: ${s.cleanlinessScore}% | Social: ${s.socialScore}% | Boundaries: ${s.boundaryScore}%`);
    });

    await prisma.$disconnect();
}

testMatching().catch(console.error);
