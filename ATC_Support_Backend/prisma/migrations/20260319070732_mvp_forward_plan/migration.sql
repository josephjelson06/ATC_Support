-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('WIDGET');

-- CreateEnum
CREATE TYPE "KnowledgeStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "sourceRefs" JSONB;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "ClientContact" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "juliaEscalationHint" TEXT,
ADD COLUMN     "juliaFallbackMessage" TEXT,
ADD COLUMN     "juliaGreeting" TEXT,
ADD COLUMN     "widgetEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ProjectDoc" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "status" "KnowledgeStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "Runbook" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "status" "KnowledgeStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "resolutionSummary" TEXT,
ADD COLUMN     "source" "TicketSource" NOT NULL DEFAULT 'WIDGET';

-- CreateTable
CREATE TABLE "EscalationHistory" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "createdById" INTEGER,
    "fromStatus" "TicketStatus" NOT NULL,
    "toStatus" "TicketStatus" NOT NULL,
    "fromAssigneeId" INTEGER,
    "toAssigneeId" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EscalationHistory_ticketId_idx" ON "EscalationHistory"("ticketId");

-- CreateIndex
CREATE INDEX "EscalationHistory_createdById_idx" ON "EscalationHistory"("createdById");

-- CreateIndex
CREATE INDEX "EscalationHistory_createdAt_idx" ON "EscalationHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ProjectDoc_status_idx" ON "ProjectDoc"("status");

-- CreateIndex
CREATE INDEX "Runbook_status_idx" ON "Runbook"("status");

-- AddForeignKey
ALTER TABLE "EscalationHistory" ADD CONSTRAINT "EscalationHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationHistory" ADD CONSTRAINT "EscalationHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
