-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "widgetAllowedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
