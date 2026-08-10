-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('ENTRY', 'MID', 'SENIOR', 'LEAD');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "businessModel" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "twitterUrl" TEXT;

-- AlterTable
ALTER TABLE "Founder" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "githubUrl" TEXT,
ADD COLUMN     "twitterUrl" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
-- Converted in place instead of dropping and re-adding the column, so existing
-- rows keep their seniority. The old values were "Entry"/"Mid"/"Senior"/"Lead",
-- which upper() turns into the enum labels; anything else fails loudly here
-- rather than quietly becoming NULL.
ALTER TABLE "Job" ALTER COLUMN "seniority" TYPE "Seniority"
USING (CASE WHEN "seniority" IS NULL THEN NULL ELSE upper("seniority")::"Seniority" END);

-- CreateIndex
CREATE INDEX "Job_seniority_status_deletedAt_idx" ON "Job"("seniority", "status", "deletedAt");
