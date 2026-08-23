const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function upsertSivaKiran() {
    console.log("=================================================");
    console.log("👤 UPSERTING STUDENT ACCOUNT: SivaKiran Abbireddy");
    console.log("=================================================");

    const email = "sivakiranabbireddy@gmail.com";
    const rawPassword = "12345678";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 1. Check if user exists
    let user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true }
    });

    if (user) {
        console.log(`Found existing user record for ${email}. Updating details...`);
        user = await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                role: "STUDENT",
                approvalStatus: "APPROVED"
            },
            include: { profile: true }
        });

        if (user.profile) {
            await prisma.studentProfile.update({
                where: { id: user.profile.id },
                data: {
                    firstName: "SivaKiran",
                    lastName: "Abbireddy",
                    gender: "MALE",
                    department: user.profile.department || "Computer Science and Engineering",
                    year: user.profile.year || 3
                }
            });
        } else {
            await prisma.studentProfile.create({
                data: {
                    userId: user.id,
                    studentId: "25B95A0501",
                    firstName: "SivaKiran",
                    lastName: "Abbireddy",
                    gender: "MALE",
                    department: "Computer Science and Engineering",
                    year: 3,
                    phone: "9876543210"
                }
            });
        }
    } else {
        console.log(`Creating new student user account for ${email}...`);
        user = await prisma.user.create({
            data: {
                email: email,
                passwordHash: hashedPassword,
                role: "STUDENT",
                approvalStatus: "APPROVED",
                profile: {
                    create: {
                        studentId: "25B95A0501",
                        firstName: "SivaKiran",
                        lastName: "Abbireddy",
                        gender: "MALE",
                        department: "Computer Science and Engineering",
                        year: 3,
                        phone: "9876543210",
                        preference: {
                            create: {
                                sleepSchedule: "00:00 - 07:00",
                                studyHabits: "Moderate (2-3 hrs)",
                                cleanliness: 4,
                                noisePreference: "Moderate",
                                socialLevel: 4,
                                guestFrequency: "Occasional",
                                smoking: false,
                                drinking: false,
                                dietary: "ANY",
                                hobbies: ["Competitive Programming", "Badminton", "Tech Blogging", "Gaming"],
                                gamingHabits: 3,
                                musicPreference: 3,
                                phoneCallHabits: 3,
                                mediaConsumption: 3,
                                sharingComfort: 4,
                                roomTemperature: "AC (Moderate)",
                                conflictResolution: "Direct Conversation",
                                visitorComfort: 3
                            }
                        }
                    }
                }
            },
            include: {
                profile: {
                    include: { preference: true }
                }
            }
        });
    }

    // Verify preference exists
    const profile = await prisma.studentProfile.findFirst({
        where: { userId: user.id },
        include: { preference: true, user: true }
    });

    if (profile && !profile.preference) {
        await prisma.preference.create({
            data: {
                studentProfileId: profile.id,
                sleepSchedule: "00:00 - 07:00",
                studyHabits: "Moderate (2-3 hrs)",
                cleanliness: 4,
                noisePreference: "Moderate",
                socialLevel: 4,
                guestFrequency: "Occasional",
                smoking: false,
                drinking: false,
                dietary: "ANY",
                hobbies: ["Competitive Programming", "Badminton", "Tech Blogging", "Gaming"],
                gamingHabits: 3,
                musicPreference: 3,
                phoneCallHabits: 3,
                mediaConsumption: 3,
                sharingComfort: 4,
                roomTemperature: "AC (Moderate)",
                conflictResolution: "Direct Conversation",
                visitorComfort: 3
            }
        });
    }

    // Verify Password Match
    const updatedUser = await prisma.user.findUnique({
        where: { email },
        include: { profile: { include: { preference: true } } }
    });

    const isMatch = await bcrypt.compare(rawPassword, updatedUser.passwordHash);

    console.log("\n✅ Account Successfully Configured in Database:");
    console.log(`   - Name: ${updatedUser.profile?.firstName} ${updatedUser.profile?.lastName}`);
    console.log(`   - Email: ${updatedUser.email}`);
    console.log(`   - Password: ${rawPassword}`);
    console.log(`   - Password Hash Verified: ${isMatch ? "YES (Valid)" : "NO"}`);
    console.log(`   - Role: ${updatedUser.role}`);
    console.log(`   - Approval Status: ${updatedUser.approvalStatus}`);
    console.log(`   - Student ID: ${updatedUser.profile?.studentId}`);
    console.log(`   - Department: ${updatedUser.profile?.department}`);
    console.log(`   - Gender: ${updatedUser.profile?.gender}`);
    console.log(`   - Hobbies: ${updatedUser.profile?.preference?.hobbies?.join(", ")}`);
    console.log("=================================================");

    await prisma.$disconnect();
}

upsertSivaKiran().catch(err => {
    console.error("❌ Error upserting student account:", err);
    process.exit(1);
});
