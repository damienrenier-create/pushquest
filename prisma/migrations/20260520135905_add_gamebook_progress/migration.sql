-- CreateTable
CREATE TABLE "GamebookProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "currentNodeId" TEXT NOT NULL,
    "mood" TEXT NOT NULL DEFAULT 'NEUTRE',
    "mbtiScores" JSONB NOT NULL DEFAULT '{}',
    "temperaments" JSONB NOT NULL DEFAULT '{}',
    "flags" JSONB NOT NULL DEFAULT '{}',
    "history" JSONB NOT NULL DEFAULT '[]',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamebookProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GamebookProgress_userId_chapterId_key" ON "GamebookProgress"("userId", "chapterId");

-- CreateIndex
CREATE INDEX "GamebookProgress_userId_idx" ON "GamebookProgress"("userId");

-- AddForeignKey
ALTER TABLE "GamebookProgress" ADD CONSTRAINT "GamebookProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
