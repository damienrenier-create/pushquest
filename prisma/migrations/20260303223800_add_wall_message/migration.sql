-- CreateTable
CREATE TABLE "WallMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WallMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WallMessage_createdAt_idx" ON "WallMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "WallMessage" ADD CONSTRAINT "WallMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
