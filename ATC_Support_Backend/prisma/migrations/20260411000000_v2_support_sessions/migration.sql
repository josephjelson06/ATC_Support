-- AddEnumValues
ALTER TYPE "TicketSource" ADD VALUE IF NOT EXISTS 'PROJECT_WIDGET';
ALTER TYPE "TicketSource" ADD VALUE IF NOT EXISTS 'GENERAL_WIDGET';
ALTER TYPE "TicketSource" ADD VALUE IF NOT EXISTS 'INTERNAL';

-- CreateEnum
CREATE TYPE "SupportType" AS ENUM ('GENERAL', 'SOFTWARE', 'HARDWARE');

-- CreateEnum
CREATE TYPE "SupportSessionSource" AS ENUM ('GENERAL_WIDGET', 'PROJECT_WIDGET', 'INTERNAL');

-- CreateEnum
CREATE TYPE "SupportSessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "SupportSessionMessageRole" AS ENUM ('USER', 'JULIA', 'SYSTEM');

-- CreateEnum
CREATE TYPE "HardwareCategory" AS ENUM ('PRINTER', 'SCANNER', 'NETWORK_DEVICE', 'COMPUTER', 'PERIPHERAL', 'OTHER');

-- CreateEnum
CREATE TYPE "HardwareAssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "SupportTopicScope" AS ENUM ('GLOBAL', 'CLIENT', 'PROJECT', 'HARDWARE_CATEGORY', 'HARDWARE_ASSET');

-- CreateEnum
CREATE TYPE "SupportTopicKind" AS ENUM ('FAQ', 'SOP', 'PLAYBOOK', 'VENDOR_LINK');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "clientId" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN "supportSessionId" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN "hardwareAssetId" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN "supportType" "SupportType";
ALTER TABLE "Ticket" ADD COLUMN "supportSummary" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "confidenceScore" DOUBLE PRECISION;
ALTER TABLE "Ticket" ALTER COLUMN "projectId" DROP NOT NULL;

-- RecreateForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_projectId_fkey";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "HardwareAsset" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "amcId" INTEGER,
    "category" "HardwareCategory" NOT NULL DEFAULT 'OTHER',
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "location" TEXT,
    "status" "HardwareAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "vendorSupportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTopic" (
    "id" SERIAL NOT NULL,
    "scope" "SupportTopicScope" NOT NULL DEFAULT 'GLOBAL',
    "kind" "SupportTopicKind" NOT NULL DEFAULT 'FAQ',
    "supportType" "SupportType" NOT NULL DEFAULT 'GENERAL',
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'PUBLISHED',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "clientId" INTEGER,
    "projectId" INTEGER,
    "hardwareCategory" "HardwareCategory",
    "hardwareAssetId" INTEGER,
    "vendorUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportSession" (
    "id" SERIAL NOT NULL,
    "source" "SupportSessionSource" NOT NULL DEFAULT 'PROJECT_WIDGET',
    "status" "SupportSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "supportType" "SupportType" NOT NULL DEFAULT 'GENERAL',
    "clientId" INTEGER,
    "projectId" INTEGER,
    "hardwareAssetId" INTEGER,
    "selectedTopicId" INTEGER,
    "requesterName" TEXT,
    "requesterEmail" TEXT,
    "requesterPhone" TEXT,
    "issueSummary" TEXT,
    "supportSummary" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),

    CONSTRAINT "SupportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportSessionMessage" (
    "id" SERIAL NOT NULL,
    "supportSessionId" INTEGER NOT NULL,
    "role" "SupportSessionMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sourceRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportSessionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_supportSessionId_key" ON "Ticket"("supportSessionId");
CREATE INDEX "Ticket_clientId_idx" ON "Ticket"("clientId");
CREATE INDEX "Ticket_hardwareAssetId_idx" ON "Ticket"("hardwareAssetId");
CREATE INDEX "Ticket_supportType_idx" ON "Ticket"("supportType");

-- CreateIndex
CREATE INDEX "HardwareAsset_clientId_idx" ON "HardwareAsset"("clientId");
CREATE INDEX "HardwareAsset_projectId_idx" ON "HardwareAsset"("projectId");
CREATE INDEX "HardwareAsset_amcId_idx" ON "HardwareAsset"("amcId");
CREATE INDEX "HardwareAsset_category_idx" ON "HardwareAsset"("category");
CREATE INDEX "HardwareAsset_status_idx" ON "HardwareAsset"("status");

-- CreateIndex
CREATE INDEX "SupportTopic_scope_idx" ON "SupportTopic"("scope");
CREATE INDEX "SupportTopic_kind_idx" ON "SupportTopic"("kind");
CREATE INDEX "SupportTopic_supportType_idx" ON "SupportTopic"("supportType");
CREATE INDEX "SupportTopic_status_idx" ON "SupportTopic"("status");
CREATE INDEX "SupportTopic_clientId_idx" ON "SupportTopic"("clientId");
CREATE INDEX "SupportTopic_projectId_idx" ON "SupportTopic"("projectId");
CREATE INDEX "SupportTopic_hardwareCategory_idx" ON "SupportTopic"("hardwareCategory");
CREATE INDEX "SupportTopic_hardwareAssetId_idx" ON "SupportTopic"("hardwareAssetId");

-- CreateIndex
CREATE INDEX "SupportSession_source_idx" ON "SupportSession"("source");
CREATE INDEX "SupportSession_status_idx" ON "SupportSession"("status");
CREATE INDEX "SupportSession_supportType_idx" ON "SupportSession"("supportType");
CREATE INDEX "SupportSession_clientId_idx" ON "SupportSession"("clientId");
CREATE INDEX "SupportSession_projectId_idx" ON "SupportSession"("projectId");
CREATE INDEX "SupportSession_hardwareAssetId_idx" ON "SupportSession"("hardwareAssetId");
CREATE INDEX "SupportSession_selectedTopicId_idx" ON "SupportSession"("selectedTopicId");
CREATE INDEX "SupportSession_createdAt_idx" ON "SupportSession"("createdAt");

-- CreateIndex
CREATE INDEX "SupportSessionMessage_supportSessionId_idx" ON "SupportSessionMessage"("supportSessionId");
CREATE INDEX "SupportSessionMessage_role_idx" ON "SupportSessionMessage"("role");
CREATE INDEX "SupportSessionMessage_createdAt_idx" ON "SupportSessionMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_supportSessionId_fkey" FOREIGN KEY ("supportSessionId") REFERENCES "SupportSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_hardwareAssetId_fkey" FOREIGN KEY ("hardwareAssetId") REFERENCES "HardwareAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareAsset" ADD CONSTRAINT "HardwareAsset_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HardwareAsset" ADD CONSTRAINT "HardwareAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HardwareAsset" ADD CONSTRAINT "HardwareAsset_amcId_fkey" FOREIGN KEY ("amcId") REFERENCES "Amc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTopic" ADD CONSTRAINT "SupportTopic_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTopic" ADD CONSTRAINT "SupportTopic_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTopic" ADD CONSTRAINT "SupportTopic_hardwareAssetId_fkey" FOREIGN KEY ("hardwareAssetId") REFERENCES "HardwareAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportSession" ADD CONSTRAINT "SupportSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportSession" ADD CONSTRAINT "SupportSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportSession" ADD CONSTRAINT "SupportSession_hardwareAssetId_fkey" FOREIGN KEY ("hardwareAssetId") REFERENCES "HardwareAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportSession" ADD CONSTRAINT "SupportSession_selectedTopicId_fkey" FOREIGN KEY ("selectedTopicId") REFERENCES "SupportTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportSessionMessage" ADD CONSTRAINT "SupportSessionMessage_supportSessionId_fkey" FOREIGN KEY ("supportSessionId") REFERENCES "SupportSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
