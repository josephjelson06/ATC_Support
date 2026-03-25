-- CreateEnum
CREATE TYPE "SupportLevel" AS ENUM ('SE1', 'SE2', 'SE3');

-- CreateEnum
CREATE TYPE "ScopeMode" AS ENUM ('GLOBAL', 'PROJECT_SCOPED');

-- CreateEnum
CREATE TYPE "AssignmentAuthority" AS ENUM ('SELF_ONLY', 'SELF_AND_OTHERS');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "supportLevel" "SupportLevel",
ADD COLUMN "scopeMode" "ScopeMode" NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN "assignmentAuthority" "AssignmentAuthority" NOT NULL DEFAULT 'SELF_ONLY';

-- Seed existing users into the new access-profile model before replacing the enum
UPDATE "User"
SET "supportLevel" = 'SE3', "scopeMode" = 'PROJECT_SCOPED', "assignmentAuthority" = 'SELF_ONLY'
WHERE "role"::text = 'PL';

UPDATE "User"
SET "supportLevel" = 'SE1', "scopeMode" = 'GLOBAL', "assignmentAuthority" = 'SELF_AND_OTHERS'
WHERE "role"::text = 'SE' AND "supportLevel" IS NULL;

UPDATE "User"
SET "supportLevel" = NULL, "scopeMode" = 'GLOBAL', "assignmentAuthority" = 'SELF_AND_OTHERS'
WHERE "role"::text = 'PM';

-- ReplaceEnum
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('PM', 'SE');
ALTER TABLE "User"
ALTER COLUMN "role" TYPE "Role"
USING (
  CASE
    WHEN "role"::text = 'PL' THEN 'SE'
    ELSE "role"::text
  END
)::"Role";
DROP TYPE "Role_old";

-- CreateTable
CREATE TABLE "ProjectMember" (
    "userId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("userId","projectId")
);

-- Migrate existing project ownership into project memberships
INSERT INTO "ProjectMember" ("userId", "projectId")
SELECT DISTINCT "assignedToId", "id"
FROM "Project"
WHERE "assignedToId" IS NOT NULL
ON CONFLICT ("userId", "projectId") DO NOTHING;

-- CreateIndex
CREATE INDEX "User_supportLevel_idx" ON "User"("supportLevel");

-- CreateIndex
CREATE INDEX "User_scopeMode_idx" ON "User"("scopeMode");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
