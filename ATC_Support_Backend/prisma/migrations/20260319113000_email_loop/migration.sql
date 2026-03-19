-- CreateEnum
CREATE TYPE "TicketEmailDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "TicketEmailStatus" AS ENUM ('SENT', 'LOGGED', 'RECEIVED', 'FAILED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_CUSTOMER_REPLIED';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "emailThreadToken" TEXT,
ADD COLUMN     "requesterEmail" TEXT,
ADD COLUMN     "requesterName" TEXT;

-- AlterTable
ALTER TABLE "TicketMessage" ADD COLUMN     "senderEmail" TEXT,
ADD COLUMN     "senderName" TEXT;

-- CreateTable
CREATE TABLE "TicketEmail" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "ticketMessageId" INTEGER,
    "createdById" INTEGER,
    "direction" "TicketEmailDirection" NOT NULL,
    "status" "TicketEmailStatus" NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "fromName" TEXT,
    "fromEmail" TEXT NOT NULL,
    "toName" TEXT,
    "toEmail" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "TicketEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketEmail_ticketId_idx" ON "TicketEmail"("ticketId");

-- CreateIndex
CREATE INDEX "TicketEmail_ticketMessageId_idx" ON "TicketEmail"("ticketMessageId");

-- CreateIndex
CREATE INDEX "TicketEmail_createdById_idx" ON "TicketEmail"("createdById");

-- CreateIndex
CREATE INDEX "TicketEmail_status_idx" ON "TicketEmail"("status");

-- CreateIndex
CREATE INDEX "TicketEmail_createdAt_idx" ON "TicketEmail"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_emailThreadToken_key" ON "Ticket"("emailThreadToken");

-- AddForeignKey
ALTER TABLE "TicketEmail" ADD CONSTRAINT "TicketEmail_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEmail" ADD CONSTRAINT "TicketEmail_ticketMessageId_fkey" FOREIGN KEY ("ticketMessageId") REFERENCES "TicketMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEmail" ADD CONSTRAINT "TicketEmail_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

