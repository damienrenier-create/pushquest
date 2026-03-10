-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "buyoutPaid" BOOLEAN NOT NULL DEFAULT false,
    "buyoutPaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseSet" (
    "id" TEXT NOT NULL,
    "reps" INTEGER NOT NULL,
    "exercise" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FineRecord" (
    "id" TEXT NOT NULL,
    "amountEur" INTEGER NOT NULL DEFAULT 2,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "FineRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyChallengeEntry" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SALLY_UP',
    "seconds" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyChallengeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalCertificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDateISO" TEXT NOT NULL,
    "endDateISO" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdMonthKey" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "MedicalCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PotEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountEur" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PotEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeDefinition" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isUnique" BOOLEAN NOT NULL DEFAULT false,
    "isTransferable" BOOLEAN NOT NULL DEFAULT true,
    "metricType" TEXT NOT NULL,
    "exerciseScope" TEXT NOT NULL,
    "threshold" INTEGER,
    "seriesTarget" INTEGER,
    "emoji" TEXT NOT NULL DEFAULT '🏅',

    CONSTRAINT "BadgeDefinition_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "BadgeOwnership" (
    "badgeKey" TEXT NOT NULL,
    "currentUserId" TEXT,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BadgeOwnership_pkey" PRIMARY KEY ("badgeKey")
);

-- CreateTable
CREATE TABLE "BadgeEvent" (
    "id" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "eventType" TEXT NOT NULL,
    "previousValue" DOUBLE PRECISION,
    "newValue" DOUBLE PRECISION,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BadgeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE INDEX "ExerciseSet_userId_date_idx" ON "ExerciseSet"("userId", "date");

-- CreateIndex
CREATE INDEX "ExerciseSet_date_exercise_idx" ON "ExerciseSet"("date", "exercise");

-- CreateIndex
CREATE UNIQUE INDEX "FineRecord_userId_date_key" ON "FineRecord"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyChallengeEntry_userId_date_type_key" ON "MonthlyChallengeEntry"("userId", "date", "type");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalCertificate_userId_createdMonthKey_key" ON "MedicalCertificate"("userId", "createdMonthKey");

-- AddForeignKey
ALTER TABLE "ExerciseSet" ADD CONSTRAINT "ExerciseSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FineRecord" ADD CONSTRAINT "FineRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyChallengeEntry" ADD CONSTRAINT "MonthlyChallengeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PotEvent" ADD CONSTRAINT "PotEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeOwnership" ADD CONSTRAINT "BadgeOwnership_badgeKey_fkey" FOREIGN KEY ("badgeKey") REFERENCES "BadgeDefinition"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeOwnership" ADD CONSTRAINT "BadgeOwnership_currentUserId_fkey" FOREIGN KEY ("currentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeEvent" ADD CONSTRAINT "BadgeEvent_badgeKey_fkey" FOREIGN KEY ("badgeKey") REFERENCES "BadgeDefinition"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeEvent" ADD CONSTRAINT "BadgeEvent_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeEvent" ADD CONSTRAINT "BadgeEvent_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
