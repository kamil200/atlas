-- AlterEnum
ALTER TYPE "AuthProvider" ADD VALUE 'LINKEDIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "linkedinId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_linkedinId_key" ON "User"("linkedinId");
