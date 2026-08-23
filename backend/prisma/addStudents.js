const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { getRandomHobbies } = require("../src/constants/hobbies");

const prisma = new PrismaClient();

const firstNames = [
    "Aarav", "Aditya", "Ajay", "Akash", "Akhil",
    "Amar", "Amit", "Anil", "Arjun", "Arnav",
    "Ashok", "Avinash", "Bharat", "Chaitanya", "Charan",
    "Chetan", "Danish", "Darshan", "Deepak", "Dhanush",
    "Dinesh", "Gagan", "Ganesh", "Gautham", "Girish",
    "Harish", "Harsha", "Hemanth", "Imran", "Jagan",
    "Kalyan", "Karthik", "Kiran", "Krishna", "Lohith",
    "Madhav", "Mahesh", "Manoj", "Mohan", "Naveen",
    "Nikhil", "Pavan", "Pradeep", "Pranav", "Praveen",
    "Rahul", "Rajesh", "Rakesh", "Ravi", "Rohit",
    "Sachin", "Sai", "Sandeep", "Sanjay", "Santosh",
    "Sathish", "Shashank", "Shiva", "Siddharth", "Sohan",
    "Srinivas", "Suraj", "Surya", "Tarun", "Teja",
    "Uday", "Varun", "Venkatesh", "Vikas", "Vijay",
    "Vikram", "Vinay", "Vishal", "Vivek", "Yash",
    "Yogesh", "Abhishek", "Anirudh", "Ashwin", "Balaji",
    "Bhanu", "Deva", "Dheeraj", "Gopi", "Govind",
    "Himanshu", "Jai", "Jatin", "Kamal", "Kapil",
    "Lokesh", "Manish", "Mayank", "Mithun", "Mukesh",
    "Nandan", "Nithin", "Omkar", "Pankaj", "Prakash",
    "Raghu", "Raghav", "Rajan", "Ranjith", "Rishabh",
    "Ritesh", "Roshan", "Sagar", "Samarth", "Sameer",
    "Shankar", "Sharath", "Vamsi", "Sumanth", "Koushik",
    "Rudra", "Maneesh", "Narasimha", "Varun", "SaiKiran"
];

const lastNames = [
    "Kumar",
    "Reddy",
    "Rao",
    "Naidu",
    "Varma",
    "Sharma",
    "Patel",
    "Singh",
    "Gupta",
    "Krishna"
];

const departments = [
    "CSE",
    "ECE",
    "EEE",
    "MECH",
    "CIVIL"
];

const hobbies = [
    ["Gaming", "Music"],
    ["Cricket", "Movies"],
    ["Reading", "Coding"],
    ["Gym", "Music"],
    ["Football", "Gaming"],
    ["Photography"],
    ["Drawing", "Movies"],
    ["Coding", "Gaming"],
    ["Badminton", "Music"],
    ["Anime", "Gaming"]
];

async function main() {
    console.log("🌱 Adding 120 new male students...");
    console.log("⚠️ Existing data will NOT be deleted.");

    const passwordHash = await bcrypt.hash("Test@123", 10);

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < 120; i++) {
        const number = i + 1;

        // SRKR 10-Character Format: [Joining Year 26] + B95A + [4-digit padded number: 0001-0120]
        const studentId =
            `26B95A${String(number).padStart(4, "0")}`;

        const firstName =
            firstNames[i % firstNames.length];

        const lastName =
            lastNames[i % lastNames.length];

        const cleanFirst = firstName.toLowerCase().replace(/\s+/g, '');
        const cleanLast = lastName.toLowerCase().replace(/\s+/g, '');
        let email = `${cleanFirst}.${cleanLast}@gmail.com`;

        // Safety check: if email already exists, append 3-digit student number
        const existingEmailUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingEmailUser) {
            email = `${cleanFirst}.${cleanLast}${String(number).padStart(3, "0")}@gmail.com`;
        }

        const existingProfile =
            await prisma.studentProfile.findUnique({
                where: {
                    studentId
                }
            });

        if (existingProfile) {
            console.log(`⚠️ Already exists: ${studentId} - skipping`);
            skipped++;
            continue;
        }

        await prisma.user.create({
            data: {
                email,
                passwordHash,

                role: "STUDENT",

                approvalStatus: "APPROVED",

                isActive: true,

                profile: {
                    create: {
                        firstName,
                        lastName,

                        studentId,

                        department:
                            departments[i % departments.length],

                        year:
                            (i % 4) + 1,

                        phone:
                            `98${String(10000000 + i)}`,

                        gender: "MALE",

                        profileComplete: true,

                        preference: {
                            create: {
                                // Lifestyle
                                sleepTime:
                                    `${21 + (i % 5)}:00`,

                                wakeTime:
                                    `${5 + (i % 3)}:30`,

                                weekendSleepTime:
                                    `${23 + (i % 2)}:00`,

                                weekendWakeTime:
                                    `${7 + (i % 3)}:00`,

                                lifestyleType:
                                    (i % 5) + 1,

                                exerciseHabits:
                                    (i % 5) + 1,

                                // Study
                                studyHoursPerDay:
                                    (i % 5) + 1,

                                studiesInRoom:
                                    i % 3 !== 0,

                                studyEnvironment:
                                    (i % 5) + 1,

                                noiseWhileStudy:
                                    ((i + 1) % 5) + 1,

                                examIntensity:
                                    ((i + 2) % 5) + 1,

                                // Cleanliness
                                cleanlinessLevel:
                                    (i % 5) + 1,

                                organizationLevel:
                                    ((i + 1) % 5) + 1,

                                bathroomCleanliness:
                                    ((i + 2) % 5) + 1,

                                garbageDisposal:
                                    ((i + 3) % 5) + 1,

                                sharedSpaceCleanliness:
                                    ((i + 4) % 5) + 1,

                                // Noise
                                noiseTolerance:
                                    (i % 5) + 1,

                                musicFrequency:
                                    ((i + 1) % 5) + 1,

                                gamingFrequency:
                                    ((i + 2) % 5) + 1,

                                callsFrequency:
                                    ((i + 3) % 5) + 1,

                                mediaFrequency:
                                    ((i + 4) % 5) + 1,

                                // Social
                                socialLevel:
                                    ((i + 1) % 5) + 1,

                                preferredInteraction:
                                    ((i + 2) % 5) + 1,

                                visitorFrequency:
                                    ((i + 3) % 5) + 1,

                                friendsInRoom:
                                    ((i + 4) % 5) + 1,

                                socialRoommatePreference:
                                    (i % 5) + 1,

                                // Privacy
                                privacyImportance:
                                    ((i + 1) % 5) + 1,

                                personalSpaceNeed:
                                    ((i + 2) % 5) + 1,

                                sharingComfort:
                                    ((i + 3) % 5) + 1,

                                visitorComfort:
                                    ((i + 4) % 5) + 1,

                                boundaryStrictness:
                                    (i % 5) + 1,

                                // Hard constraints
                                isSmoker:
                                    i % 12 === 0,

                                requiresNonSmoker:
                                    i % 12 !== 0,

                                blockedStudentIds: [],

                                hasSpecialRequirements:
                                    i % 20 === 0,

                                specialRequirements:
                                    i % 20 === 0
                                        ? "Prefers lower bunk"
                                        : null,

                                hobbies:
                                    getRandomHobbies(4),

                                isComplete: true
                            }
                        }
                    }
                }
            }
        });

        created++;

        if (created % 10 === 0) {
            console.log(`✅ ${created}/120 students added`);
        }
    }

    console.log("\n======================================");
    console.log("🎉 DATASET INSERTION COMPLETED");
    console.log("======================================");
    console.log(`Existing data: PRESERVED`);
    console.log(`New students:  ${created}`);
    console.log(`Skipped:       ${skipped}`);
    console.log(`Gender:        MALE`);
    console.log(`Password:      Test@123`);
    console.log("======================================");
}

main()
    .catch((error) => {
        console.error("❌ Error adding students:");
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });