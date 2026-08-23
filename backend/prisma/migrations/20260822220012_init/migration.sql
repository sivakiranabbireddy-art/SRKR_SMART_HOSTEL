-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchingRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConflictStatus" AS ENUM ('REPORTED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "phone" TEXT,
    "gender" TEXT NOT NULL,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "sleepTime" TEXT NOT NULL,
    "wakeTime" TEXT NOT NULL,
    "weekendSleepTime" TEXT NOT NULL,
    "weekendWakeTime" TEXT NOT NULL,
    "lifestyleType" INTEGER NOT NULL,
    "exerciseHabits" INTEGER NOT NULL,
    "studyHoursPerDay" INTEGER NOT NULL,
    "studiesInRoom" BOOLEAN NOT NULL,
    "studyEnvironment" INTEGER NOT NULL,
    "noiseWhileStudy" INTEGER NOT NULL,
    "examIntensity" INTEGER NOT NULL,
    "cleanlinessLevel" INTEGER NOT NULL,
    "organizationLevel" INTEGER NOT NULL,
    "bathroomCleanliness" INTEGER NOT NULL,
    "garbageDisposal" INTEGER NOT NULL,
    "sharedSpaceCleanliness" INTEGER NOT NULL,
    "noiseTolerance" INTEGER NOT NULL,
    "musicFrequency" INTEGER NOT NULL,
    "gamingFrequency" INTEGER NOT NULL,
    "callsFrequency" INTEGER NOT NULL,
    "mediaFrequency" INTEGER NOT NULL,
    "socialLevel" INTEGER NOT NULL,
    "preferredInteraction" INTEGER NOT NULL,
    "visitorFrequency" INTEGER NOT NULL,
    "friendsInRoom" INTEGER NOT NULL,
    "socialRoommatePreference" INTEGER NOT NULL,
    "privacyImportance" INTEGER NOT NULL,
    "personalSpaceNeed" INTEGER NOT NULL,
    "sharingComfort" INTEGER NOT NULL,
    "visitorComfort" INTEGER NOT NULL,
    "boundaryStrictness" INTEGER NOT NULL,
    "isSmoker" BOOLEAN NOT NULL DEFAULT false,
    "requiresNonSmoker" BOOLEAN NOT NULL DEFAULT false,
    "blockedStudentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hasSpecialRequirements" BOOLEAN NOT NULL DEFAULT false,
    "specialRequirements" TEXT,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "floor" INTEGER,
    "building" TEXT,
    "description" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomAllocation" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "matchingRunId" TEXT,
    "status" "AllocationStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompatibilityScore" (
    "id" TEXT NOT NULL,
    "studentAId" TEXT NOT NULL,
    "studentBId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "lifestyleScore" DOUBLE PRECISION,
    "studyScore" DOUBLE PRECISION,
    "cleanlinessScore" DOUBLE PRECISION,
    "socialScore" DOUBLE PRECISION,
    "boundaryScore" DOUBLE PRECISION,
    "hardConflict" BOOLEAN NOT NULL DEFAULT false,
    "conflictReason" TEXT,
    "matchingRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompatibilityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchingRun" (
    "id" TEXT NOT NULL,
    "status" "MatchingRunStatus" NOT NULL DEFAULT 'RUNNING',
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "totalRooms" INTEGER NOT NULL DEFAULT 0,
    "studentsAssigned" INTEGER NOT NULL DEFAULT 0,
    "studentsUnassigned" INTEGER NOT NULL DEFAULT 0,
    "avgCompatibility" DOUBLE PRECISION,
    "algorithmVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "notes" TEXT,
    "runDurationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "roomAllocationId" TEXT NOT NULL,
    "overallSatisfaction" INTEGER NOT NULL,
    "cleanlinessScore" INTEGER NOT NULL,
    "studyCompatibility" INTEGER NOT NULL,
    "lifestyleCompatibility" INTEGER NOT NULL,
    "noiseCompatibility" INTEGER NOT NULL,
    "wouldChooseAgain" BOOLEAN NOT NULL,
    "conflictExperienced" BOOLEAN NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conflict" (
    "id" TEXT NOT NULL,
    "reporterProfileId" TEXT NOT NULL,
    "reportedProfileId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ConflictStatus" NOT NULL DEFAULT 'REPORTED',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "questionnaireDeadline" TIMESTAMP(3),
    "questionnaireOpen" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OtpVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_studentId_key" ON "StudentProfile"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Preference_studentProfileId_key" ON "Preference"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_number_key" ON "Room"("number");

-- CreateIndex
CREATE UNIQUE INDEX "RoomAllocation_roomId_studentProfileId_key" ON "RoomAllocation"("roomId", "studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CompatibilityScore_studentAId_studentBId_matchingRunId_key" ON "CompatibilityScore"("studentAId", "studentBId", "matchingRunId");

-- CreateIndex
CREATE UNIQUE INDEX "OtpVerification_email_key" ON "OtpVerification"("email");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAllocation" ADD CONSTRAINT "RoomAllocation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAllocation" ADD CONSTRAINT "RoomAllocation_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAllocation" ADD CONSTRAINT "RoomAllocation_matchingRunId_fkey" FOREIGN KEY ("matchingRunId") REFERENCES "MatchingRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityScore" ADD CONSTRAINT "CompatibilityScore_studentAId_fkey" FOREIGN KEY ("studentAId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityScore" ADD CONSTRAINT "CompatibilityScore_studentBId_fkey" FOREIGN KEY ("studentBId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityScore" ADD CONSTRAINT "CompatibilityScore_matchingRunId_fkey" FOREIGN KEY ("matchingRunId") REFERENCES "MatchingRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_roomAllocationId_fkey" FOREIGN KEY ("roomAllocationId") REFERENCES "RoomAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conflict" ADD CONSTRAINT "Conflict_reporterProfileId_fkey" FOREIGN KEY ("reporterProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conflict" ADD CONSTRAINT "Conflict_reportedProfileId_fkey" FOREIGN KEY ("reportedProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
