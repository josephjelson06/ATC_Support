This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
Backend/
  prisma/
    migrations/
      20260316000000_init/
        migration.sql
      migration_lock.toml
    schema.prisma
    seed.ts
  src/
    config/
      env.ts
    lib/
      prisma.ts
    middleware/
      auth.ts
      role.ts
      validate.ts
    routes/
      amcs.ts
      auth.ts
      chatSessions.ts
      clientContacts.ts
      clients.ts
      consigneeContacts.ts
      consignees.ts
      dashboard.ts
      faqs.ts
      projectDocs.ts
      projects.ts
      reports.ts
      runbooks.ts
      ticketMessages.ts
      tickets.ts
      users.ts
      widget.ts
    services/
      julia.ts
      tickets.ts
    types/
      auth.ts
      express.d.ts
    utils/
      access.ts
      http.ts
      idPrefix.ts
      serializers.ts
      widgetKey.ts
    index.ts
  .env.example
  .gitignore
  package.json
  prisma.config.ts
  tsconfig.json
```

# Files

## File: Backend/prisma/migrations/20260316000000_init/migration.sql
```sql
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PM', 'PL', 'SE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AmcStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('REPLY', 'INTERNAL_NOTE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ChatSessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'JULIA');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "designation" TEXT,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consignee" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "Consignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsigneeContact" (
    "id" SERIAL NOT NULL,
    "consigneeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "designation" TEXT,

    CONSTRAINT "ConsigneeContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amc" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "hoursIncluded" INTEGER NOT NULL,
    "hoursUsed" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "AmcStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Amc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "assignedToId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "widgetKey" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "chatSessionId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'NEW',
    "assignedToId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "userId" INTEGER,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'REPLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "status" "ChatSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "chatSessionId" INTEGER NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Runbook" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Runbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDoc" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "ClientContact_clientId_idx" ON "ClientContact"("clientId");

-- CreateIndex
CREATE INDEX "Consignee_clientId_idx" ON "Consignee"("clientId");

-- CreateIndex
CREATE INDEX "ConsigneeContact_consigneeId_idx" ON "ConsigneeContact"("consigneeId");

-- CreateIndex
CREATE INDEX "Amc_clientId_idx" ON "Amc"("clientId");

-- CreateIndex
CREATE INDEX "Amc_projectId_idx" ON "Amc"("projectId");

-- CreateIndex
CREATE INDEX "Amc_status_idx" ON "Amc"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Project_widgetKey_key" ON "Project"("widgetKey");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE INDEX "Project_assignedToId_idx" ON "Project"("assignedToId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_chatSessionId_key" ON "Ticket"("chatSessionId");

-- CreateIndex
CREATE INDEX "Ticket_projectId_idx" ON "Ticket"("projectId");

-- CreateIndex
CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_priority_idx" ON "Ticket"("priority");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- CreateIndex
CREATE INDEX "TicketMessage_userId_idx" ON "TicketMessage"("userId");

-- CreateIndex
CREATE INDEX "TicketMessage_type_idx" ON "TicketMessage"("type");

-- CreateIndex
CREATE INDEX "ChatSession_projectId_idx" ON "ChatSession"("projectId");

-- CreateIndex
CREATE INDEX "ChatSession_status_idx" ON "ChatSession"("status");

-- CreateIndex
CREATE INDEX "ChatMessage_chatSessionId_idx" ON "ChatMessage"("chatSessionId");

-- CreateIndex
CREATE INDEX "ChatMessage_role_idx" ON "ChatMessage"("role");

-- CreateIndex
CREATE INDEX "Faq_projectId_idx" ON "Faq"("projectId");

-- CreateIndex
CREATE INDEX "Runbook_createdById_idx" ON "Runbook"("createdById");

-- CreateIndex
CREATE INDEX "Runbook_category_idx" ON "Runbook"("category");

-- CreateIndex
CREATE INDEX "ProjectDoc_projectId_idx" ON "ProjectDoc"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDoc_createdById_idx" ON "ProjectDoc"("createdById");

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consignee" ADD CONSTRAINT "Consignee_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsigneeContact" ADD CONSTRAINT "ConsigneeContact_consigneeId_fkey" FOREIGN KEY ("consigneeId") REFERENCES "Consignee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amc" ADD CONSTRAINT "Amc_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amc" ADD CONSTRAINT "Amc_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Runbook" ADD CONSTRAINT "Runbook_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDoc" ADD CONSTRAINT "ProjectDoc_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDoc" ADD CONSTRAINT "ProjectDoc_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

## File: Backend/prisma/migrations/migration_lock.toml
```toml
provider = "postgresql"
```

## File: Backend/prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  PM
  PL
  SE
}

enum UserStatus {
  ACTIVE
  INACTIVE
}

enum ClientStatus {
  ACTIVE
  INACTIVE
}

enum ProjectStatus {
  ACTIVE
  INACTIVE
}

enum AmcStatus {
  ACTIVE
  EXPIRED
  CANCELLED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TicketStatus {
  NEW
  ASSIGNED
  IN_PROGRESS
  ESCALATED
  RESOLVED
}

enum MessageType {
  REPLY
  INTERNAL_NOTE
  SYSTEM
}

enum ChatSessionStatus {
  ACTIVE
  ENDED
  ESCALATED
}

enum ChatRole {
  USER
  JULIA
}

model User {
  id               Int             @id @default(autoincrement())
  name             String
  email            String          @unique
  passwordHash     String
  role             Role
  status           UserStatus      @default(ACTIVE)
  createdAt        DateTime        @default(now())
  assignedProjects Project[]       @relation("ProjectLead")
  assignedTickets  Ticket[]        @relation("TicketAssignee")
  ticketMessages   TicketMessage[]
  runbooks         Runbook[]       @relation("RunbookAuthor")
  projectDocs      ProjectDoc[]    @relation("ProjectDocAuthor")

  @@index([role])
  @@index([status])
}

model Client {
  id         Int             @id @default(autoincrement())
  name       String
  industry   String?
  status     ClientStatus    @default(ACTIVE)
  createdAt  DateTime        @default(now())
  contacts   ClientContact[]
  consignees Consignee[]
  amcs       Amc[]
  projects   Project[]

  @@index([status])
}

model ClientContact {
  id          Int     @id @default(autoincrement())
  clientId    Int
  name        String
  email       String?
  phone       String?
  designation String?
  client      Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
}

model Consignee {
  id        Int                 @id @default(autoincrement())
  clientId  Int
  name      String
  address   String
  client    Client              @relation(fields: [clientId], references: [id], onDelete: Cascade)
  contacts  ConsigneeContact[]

  @@index([clientId])
}

model ConsigneeContact {
  id          Int       @id @default(autoincrement())
  consigneeId Int
  name        String
  email       String?
  phone       String?
  designation String?
  consignee   Consignee @relation(fields: [consigneeId], references: [id], onDelete: Cascade)

  @@index([consigneeId])
}

model Amc {
  id            Int       @id @default(autoincrement())
  clientId      Int
  projectId     Int?
  hoursIncluded Int
  hoursUsed     Int       @default(0)
  startDate     DateTime  @db.Date
  endDate       DateTime  @db.Date
  status        AmcStatus @default(ACTIVE)
  client        Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  project       Project?  @relation(fields: [projectId], references: [id], onDelete: SetNull)

  @@index([clientId])
  @@index([projectId])
  @@index([status])
}

model Project {
  id           Int             @id @default(autoincrement())
  clientId     Int
  assignedToId Int?
  name         String
  description  String?
  widgetKey    String          @unique
  status       ProjectStatus   @default(ACTIVE)
  createdAt    DateTime        @default(now())
  client       Client          @relation(fields: [clientId], references: [id], onDelete: Cascade)
  assignedTo   User?           @relation("ProjectLead", fields: [assignedToId], references: [id], onDelete: SetNull)
  amcs         Amc[]
  tickets      Ticket[]
  faqs         Faq[]
  docs         ProjectDoc[]
  chatSessions ChatSession[]

  @@index([clientId])
  @@index([assignedToId])
  @@index([status])
}

model Ticket {
  id            Int            @id @default(autoincrement())
  projectId     Int
  chatSessionId Int?           @unique
  title         String
  description   String?
  priority      TicketPriority @default(MEDIUM)
  status        TicketStatus   @default(NEW)
  assignedToId  Int?
  createdAt     DateTime       @default(now())
  resolvedAt    DateTime?
  project       Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  chatSession   ChatSession?   @relation(fields: [chatSessionId], references: [id], onDelete: SetNull)
  assignedTo    User?          @relation("TicketAssignee", fields: [assignedToId], references: [id], onDelete: SetNull)
  messages      TicketMessage[]

  @@index([projectId])
  @@index([assignedToId])
  @@index([status])
  @@index([priority])
}

model TicketMessage {
  id         Int         @id @default(autoincrement())
  ticketId   Int
  userId     Int?
  content    String
  type       MessageType @default(REPLY)
  createdAt  DateTime    @default(now())
  ticket     Ticket      @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  user       User?       @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([ticketId])
  @@index([userId])
  @@index([type])
}

model ChatSession {
  id          Int               @id @default(autoincrement())
  projectId   Int
  clientName  String
  clientEmail String
  status      ChatSessionStatus @default(ACTIVE)
  createdAt   DateTime          @default(now())
  endedAt     DateTime?
  project     Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  messages    ChatMessage[]
  ticket      Ticket?

  @@index([projectId])
  @@index([status])
}

model ChatMessage {
  id            Int         @id @default(autoincrement())
  chatSessionId Int
  role          ChatRole
  content       String
  createdAt     DateTime    @default(now())
  chatSession   ChatSession @relation(fields: [chatSessionId], references: [id], onDelete: Cascade)

  @@index([chatSessionId])
  @@index([role])
}

model Faq {
  id        Int      @id @default(autoincrement())
  projectId Int
  question  String
  answer    String
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}

model Runbook {
  id          Int       @id @default(autoincrement())
  title       String
  content     String
  category    String?
  createdById Int?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  createdBy   User?     @relation("RunbookAuthor", fields: [createdById], references: [id], onDelete: SetNull)

  @@index([createdById])
  @@index([category])
}

model ProjectDoc {
  id          Int       @id @default(autoincrement())
  projectId   Int
  title       String
  content     String
  createdById Int?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy   User?     @relation("ProjectDocAuthor", fields: [createdById], references: [id], onDelete: SetNull)

  @@index([projectId])
  @@index([createdById])
}
```

## File: Backend/prisma/seed.ts
```typescript
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import {
  AmcStatus,
  ChatRole,
  ChatSessionStatus,
  ClientStatus,
  MessageType,
  PrismaClient,
  ProjectStatus,
  Role,
  TicketPriority,
  TicketStatus,
  UserStatus,
} from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? '',
  }),
});

const password = 'password';

const safeDate = (value: string) => new Date(value);

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.projectDoc.deleteMany();
  await prisma.runbook.deleteMany();
  await prisma.amc.deleteMany();
  await prisma.consigneeContact.deleteMany();
  await prisma.consignee.deleteMany();
  await prisma.clientContact.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const [pm, se, pl1, pl2, pl3] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Priya Manager',
        email: 'pm@atc.com',
        passwordHash,
        role: Role.PM,
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Sanjay Support',
        email: 'se@atc.com',
        passwordHash,
        role: Role.SE,
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Aisha Lead',
        email: 'pl1@atc.com',
        passwordHash,
        role: Role.PL,
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Rahul Lead',
        email: 'pl2@atc.com',
        passwordHash,
        role: Role.PL,
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Neha Lead',
        email: 'pl3@atc.com',
        passwordHash,
        role: Role.PL,
        status: UserStatus.ACTIVE,
      },
    }),
  ]);

  const acmeClient = await prisma.client.create({
    data: {
      name: 'Acme Logistics',
      industry: 'Logistics',
      status: ClientStatus.ACTIVE,
      contacts: {
        create: [
          {
            name: 'Arun Shah',
            email: 'arun@acme-logistics.com',
            phone: '9876543210',
            designation: 'IT Manager',
          },
        ],
      },
      consignees: {
        create: [
          {
            name: 'Acme North Hub',
            address: 'Bangalore, Karnataka',
            contacts: {
              create: [
                {
                  name: 'Meera Singh',
                  email: 'meera@acme-logistics.com',
                  phone: '9988776655',
                  designation: 'Operations Lead',
                },
              ],
            },
          },
        ],
      },
    },
  });

  const betaClient = await prisma.client.create({
    data: {
      name: 'Beta Retail',
      industry: 'Retail',
      status: ClientStatus.ACTIVE,
      contacts: {
        create: [
          {
            name: 'Karan Verma',
            email: 'karan@beta-retail.com',
            phone: '9123456789',
            designation: 'Product Owner',
          },
        ],
      },
    },
  });

  const [warehouseProject, crmProject, billingProject] = await Promise.all([
    prisma.project.create({
      data: {
        clientId: acmeClient.id,
        assignedToId: pl1.id,
        name: 'Warehouse Portal',
        description: 'Support portal for warehouse staff and consignees.',
        widgetKey: 'widget_warehouse_portal',
        status: ProjectStatus.ACTIVE,
      },
    }),
    prisma.project.create({
      data: {
        clientId: acmeClient.id,
        assignedToId: pl2.id,
        name: 'CRM Dashboard',
        description: 'Internal customer support CRM dashboard.',
        widgetKey: 'widget_crm_dashboard',
        status: ProjectStatus.ACTIVE,
      },
    }),
    prisma.project.create({
      data: {
        clientId: betaClient.id,
        assignedToId: pl3.id,
        name: 'Billing Suite',
        description: 'Retail billing and reconciliation application.',
        widgetKey: 'widget_billing_suite',
        status: ProjectStatus.ACTIVE,
      },
    }),
  ]);

  await prisma.amc.createMany({
    data: [
      {
        clientId: acmeClient.id,
        projectId: warehouseProject.id,
        hoursIncluded: 40,
        hoursUsed: 12,
        startDate: safeDate('2026-01-01'),
        endDate: safeDate('2026-12-31'),
        status: AmcStatus.ACTIVE,
      },
      {
        clientId: betaClient.id,
        projectId: billingProject.id,
        hoursIncluded: 24,
        hoursUsed: 5,
        startDate: safeDate('2026-02-01'),
        endDate: safeDate('2026-11-30'),
        status: AmcStatus.ACTIVE,
      },
    ],
  });

  await prisma.runbook.createMany({
    data: [
      {
        title: 'Reset user password',
        content: 'Verify the user account, trigger a reset link from the admin panel, and confirm login after reset.',
        category: 'Authentication',
        createdById: se.id,
      },
      {
        title: 'Clear stuck job queue',
        content: 'Check the worker health dashboard, restart failed workers, and requeue failed jobs after reviewing error logs.',
        category: 'Operations',
        createdById: pl1.id,
      },
    ],
  });

  await prisma.projectDoc.createMany({
    data: [
      {
        projectId: warehouseProject.id,
        title: 'Warehouse portal overview',
        content: 'Inbound users can raise stock mismatch and login issues. Common fixes involve session reset and cache clearing.',
        createdById: pl1.id,
      },
      {
        projectId: crmProject.id,
        title: 'CRM escalation rules',
        content: 'Sales tickets should route to the CRM project lead. Export failures usually depend on nightly job completion.',
        createdById: pl2.id,
      },
      {
        projectId: billingProject.id,
        title: 'Billing reconciliation notes',
        content: 'If invoice totals do not match, confirm tax configuration and rerun the day-end reconciliation.',
        createdById: pl3.id,
      },
    ],
  });

  await prisma.faq.createMany({
    data: [
      {
        projectId: warehouseProject.id,
        question: 'How do I reset my warehouse portal password?',
        answer: 'Use the forgot password link on the login page and check your registered email.',
        sortOrder: 1,
      },
      {
        projectId: warehouseProject.id,
        question: 'Why is my dashboard blank?',
        answer: 'Refresh the page and clear the browser cache. If the issue persists, contact support.',
        sortOrder: 2,
      },
      {
        projectId: billingProject.id,
        question: 'How do I rerun billing reconciliation?',
        answer: 'Go to the reconciliation screen, confirm the date, and run the process again.',
        sortOrder: 1,
      },
    ],
  });

  const escalatedChat = await prisma.chatSession.create({
    data: {
      projectId: warehouseProject.id,
      clientName: 'Ravi Kumar',
      clientEmail: 'ravi.kumar@acme-logistics.com',
      status: ChatSessionStatus.ESCALATED,
      createdAt: safeDate('2026-03-01T09:00:00Z'),
      endedAt: safeDate('2026-03-01T09:15:00Z'),
      messages: {
        create: [
          {
            role: ChatRole.USER,
            content: 'I cannot log in to the warehouse portal.',
            createdAt: safeDate('2026-03-01T09:00:00Z'),
          },
          {
            role: ChatRole.JULIA,
            content: 'Please try resetting your password using the forgot password link.',
            createdAt: safeDate('2026-03-01T09:01:00Z'),
          },
          {
            role: ChatRole.USER,
            content: 'That did not work and I still see an access denied error.',
            createdAt: safeDate('2026-03-01T09:02:00Z'),
          },
        ],
      },
    },
    include: {
      messages: true,
    },
  });

  const activeChat = await prisma.chatSession.create({
    data: {
      projectId: billingProject.id,
      clientName: 'Ishita Rao',
      clientEmail: 'ishita@beta-retail.com',
      status: ChatSessionStatus.ACTIVE,
      messages: {
        create: [
          {
            role: ChatRole.USER,
            content: 'How do I rerun reconciliation for yesterday?',
          },
          {
            role: ChatRole.JULIA,
            content: 'Open the reconciliation page, pick the previous business date, and start the rerun process.',
          },
        ],
      },
    },
  });

  const newTicket = await prisma.ticket.create({
    data: {
      projectId: warehouseProject.id,
      chatSessionId: escalatedChat.id,
      title: 'Warehouse portal access denied after password reset',
      description: 'User reset the password but still receives access denied during login.',
      priority: TicketPriority.HIGH,
      status: TicketStatus.NEW,
    },
  });

  const assignedTicket = await prisma.ticket.create({
    data: {
      projectId: crmProject.id,
      title: 'CRM export job failed overnight',
      description: 'Daily export did not generate the expected file.',
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.IN_PROGRESS,
      assignedToId: se.id,
    },
  });

  const resolvedTicket = await prisma.ticket.create({
    data: {
      projectId: billingProject.id,
      title: 'Billing reconciliation mismatch',
      description: 'Tax total was inconsistent after a product update.',
      priority: TicketPriority.HIGH,
      status: TicketStatus.RESOLVED,
      assignedToId: pl3.id,
      resolvedAt: safeDate('2026-03-05T12:00:00Z'),
    },
  });

  await prisma.ticketMessage.createMany({
    data: [
      {
        ticketId: newTicket.id,
        userId: null,
        type: MessageType.SYSTEM,
        content: 'Ticket created from widget escalation.',
      },
      {
        ticketId: assignedTicket.id,
        userId: se.id,
        type: MessageType.REPLY,
        content: 'I have restarted the export worker and I am monitoring the next run.',
      },
      {
        ticketId: resolvedTicket.id,
        userId: pl3.id,
        type: MessageType.REPLY,
        content: 'Updated the tax mapping and reran reconciliation successfully.',
      },
    ],
  });

  console.log('Seed completed successfully.');
  console.log('Login credentials:');
  console.log(`PM: ${pm.email} / ${password}`);
  console.log(`SE: ${se.email} / ${password}`);
  console.log(`PL: ${pl1.email} / ${password}`);
  console.log(`Extra PLs: ${pl2.email}, ${pl3.email}`);
  console.log(`Sample active chat session: ${activeChat.id}`);
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## File: Backend/src/config/env.ts
```typescript
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  GROQ_API_KEY: z.string().default(''),
  GROQ_MODEL: z.string().default('llama-3.1-8b-instant'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsedEnv.data;
```

## File: Backend/src/lib/prisma.ts
```typescript
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { env } from '../config/env';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

## File: Backend/src/middleware/auth.ts
```typescript
import type { JwtPayload as DefaultJwtPayload } from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { asyncHandler, unauthorized } from '../utils/http';

export const authMiddleware: RequestHandler = asyncHandler(async (req, _res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw unauthorized('Missing bearer token.');
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();

  if (!token) {
    throw unauthorized('Missing bearer token.');
  }

  let payload: DefaultJwtPayload;

  try {
    const verifiedToken = jwt.verify(token, env.JWT_SECRET);

    if (typeof verifiedToken === 'string') {
      throw unauthorized('Invalid or expired token.');
    }

    payload = verifiedToken;
  } catch {
    throw unauthorized('Invalid or expired token.');
  }

  const userId = Number(payload.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw unauthorized('Invalid token payload.');
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw unauthorized('User is not authorized.');
  }

  req.user = user;
  next();
});
```

## File: Backend/src/middleware/role.ts
```typescript
import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';

import { forbidden, unauthorized } from '../utils/http';

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      throw unauthorized();
    }

    if (!roles.includes(req.user.role)) {
      throw forbidden('You do not have permission to perform this action.');
    }

    next();
  };
```

## File: Backend/src/middleware/validate.ts
```typescript
import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

import { badRequest } from '../utils/http';

type Source = 'body' | 'params' | 'query';

export const validate =
  (schema: ZodTypeAny, source: Source = 'body'): RequestHandler =>
  (req, _res, next) => {
    const parsed = schema.safeParse(req[source]);

    if (!parsed.success) {
      throw badRequest('Validation failed.', parsed.error.flatten());
    }

    (req as unknown as Record<Source, unknown>)[source] = parsed.data;
    next();
  };
```

## File: Backend/src/routes/amcs.ts
```typescript
import { AmcStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, badRequest, parseId } from '../utils/http';
import { serializeAmc } from '../utils/serializers';

const router = Router();

const dateSchema = z
  .string()
  .transform((value) => new Date(value))
  .refine((value) => !Number.isNaN(value.getTime()), { message: 'Invalid date.' });

const createAmcSchema = z
  .object({
    projectId: z.number().int().positive().nullable().optional(),
    hoursIncluded: z.number().int().nonnegative(),
    hoursUsed: z.number().int().nonnegative().optional(),
    startDate: dateSchema,
    endDate: dateSchema,
    status: z.nativeEnum(AmcStatus).optional(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: 'endDate must be on or after startDate.',
  });

const updateAmcSchema = z
  .object({
    projectId: z.number().int().positive().nullable().optional(),
    hoursIncluded: z.number().int().nonnegative().optional(),
    hoursUsed: z.number().int().nonnegative().optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    status: z.nativeEnum(AmcStatus).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

const assertProjectBelongsToClient = async (clientId: number, projectId: number | null | undefined) => {
  if (!projectId) {
    return;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      clientId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    throw badRequest('Selected project does not belong to this client.');
  }
};

router.get(
  '/clients/:id/amcs',
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const amcs = await prisma.amc.findMany({
      where: {
        clientId,
      },
      include: {
        project: {
          include: {
            client: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    res.json(amcs.map((amc) => serializeAmc(amc)));
  }),
);

router.post(
  '/clients/:id/amcs',
  requireRole(Role.PM),
  validate(createAmcSchema),
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const payload = req.body as z.infer<typeof createAmcSchema>;
    await assertProjectBelongsToClient(clientId, payload.projectId);
    const amc = await prisma.amc.create({
      data: {
        clientId,
        projectId: payload.projectId ?? null,
        hoursIncluded: payload.hoursIncluded,
        hoursUsed: payload.hoursUsed ?? 0,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: payload.status ?? AmcStatus.ACTIVE,
      },
      include: {
        project: {
          include: {
            client: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(serializeAmc(amc));
  }),
);

router.patch(
  '/amcs/:id',
  requireRole(Role.PM),
  validate(updateAmcSchema),
  asyncHandler(async (req, res) => {
    const amcId = parseId(req.params.id, 'amc id');
    const payload = req.body as z.infer<typeof updateAmcSchema>;
    const existingAmc = await prisma.amc.findUnique({
      where: {
        id: amcId,
      },
      select: {
        id: true,
        clientId: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!existingAmc) {
      throw badRequest('AMC not found.');
    }

    await assertProjectBelongsToClient(existingAmc.clientId, payload.projectId);

    const nextStartDate = payload.startDate ?? existingAmc.startDate;
    const nextEndDate = payload.endDate ?? existingAmc.endDate;

    if (nextEndDate < nextStartDate) {
      throw badRequest('endDate must be on or after startDate.');
    }

    const amc = await prisma.amc.update({
      where: {
        id: amcId,
      },
      data: {
        ...payload,
        projectId: payload.projectId === undefined ? undefined : payload.projectId,
      },
      include: {
        project: {
          include: {
            client: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    res.json(serializeAmc(amc));
  }),
);

router.delete(
  '/amcs/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const amcId = parseId(req.params.id, 'amc id');

    await prisma.amc.delete({
      where: {
        id: amcId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
```

## File: Backend/src/routes/auth.ts
```typescript
import bcrypt from 'bcrypt';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, unauthorized } from '../utils/http';
import { serializeUser } from '../utils/serializers';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

const signToken = (userId: number) =>
  jwt.sign(
    {
      sub: userId,
    },
    env.JWT_SECRET,
    {
      expiresIn: '7d',
    },
  );

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
      select: {
        ...userSelect,
        passwordHash: true,
      },
    });

    if (!user) {
      throw unauthorized('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw unauthorized('Invalid email or password.');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;

    res.json({
      token: signToken(user.id),
      user: serializeUser(safeUser),
    });
  }),
);

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user!.id,
      },
      select: userSelect,
    });

    res.json({
      user: serializeUser(user),
    });
  }),
);

export default router;
```

## File: Backend/src/routes/chatSessions.ts
```typescript
import { Router } from 'express';

import { prisma } from '../lib/prisma';
import { assertChatSessionAccess, chatSessionScopeForUser } from '../utils/access';
import { asyncHandler, parseId, notFound } from '../utils/http';
import { serializeChatSession, serializeTicketMessage } from '../utils/serializers';

const router = Router();

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const chatSessions = await prisma.chatSession.findMany({
      where: chatSessionScopeForUser(req.user!),
      include: {
        project: {
          include: {
            client: true,
            assignedTo: {
              select: safeUserSelect,
            },
          },
        },
        ticket: {
          include: {
            project: {
              include: {
                client: true,
                assignedTo: {
                  select: safeUserSelect,
                },
              },
            },
            assignedTo: {
              select: safeUserSelect,
            },
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(chatSessions.map((chatSession) => serializeChatSession(chatSession)));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const chatSessionId = parseId(req.params.id, 'chat session id');
    await assertChatSessionAccess(req.user!, chatSessionId);
    const chatSession = await prisma.chatSession.findUnique({
      where: {
        id: chatSessionId,
      },
      include: {
        project: {
          include: {
            client: true,
            assignedTo: {
              select: safeUserSelect,
            },
          },
        },
        ticket: {
          include: {
            project: {
              include: {
                client: true,
                assignedTo: {
                  select: safeUserSelect,
                },
              },
            },
            assignedTo: {
              select: safeUserSelect,
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!chatSession) {
      throw notFound('Chat session not found.');
    }

    res.json({
      ...serializeChatSession(chatSession),
      messages: chatSession.messages.map((message) => serializeTicketMessage(message as never)),
    });
  }),
);

export default router;
```

## File: Backend/src/routes/clientContacts.ts
```typescript
import { Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, parseId, notFound } from '../utils/http';

const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email().optional(),
  phone: z.string().trim().min(5).optional(),
  designation: z.string().trim().optional(),
});

const updateContactSchema = contactSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

router.get(
  '/clients/:id/contacts',
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
      },
      select: {
        id: true,
        contacts: true,
      },
    });

    if (!client) {
      throw notFound('Client not found.');
    }

    res.json(client.contacts);
  }),
);

router.post(
  '/clients/:id/contacts',
  requireRole(Role.PM),
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const payload = req.body as z.infer<typeof contactSchema>;
    const contact = await prisma.clientContact.create({
      data: {
        clientId,
        ...payload,
      },
    });

    res.status(201).json(contact);
  }),
);

router.patch(
  '/contacts/:id',
  requireRole(Role.PM),
  validate(updateContactSchema),
  asyncHandler(async (req, res) => {
    const contactId = parseId(req.params.id, 'contact id');
    const payload = req.body as z.infer<typeof updateContactSchema>;
    const contact = await prisma.clientContact.update({
      where: {
        id: contactId,
      },
      data: payload,
    });

    res.json(contact);
  }),
);

router.delete(
  '/contacts/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const contactId = parseId(req.params.id, 'contact id');

    await prisma.clientContact.delete({
      where: {
        id: contactId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
```

## File: Backend/src/routes/clients.ts
```typescript
import { ClientStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, conflict, parseId, notFound } from '../utils/http';
import { serializeAmc, serializeClient, serializeProject } from '../utils/serializers';

const router = Router();

const createClientSchema = z.object({
  name: z.string().trim().min(2),
  industry: z.string().trim().optional(),
  status: z.nativeEnum(ClientStatus).optional(),
});

const updateClientSchema = createClientSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        industry: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            contacts: true,
            consignees: true,
            projects: true,
            amcs: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    res.json(clients.map((client) => serializeClient(client)));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
      },
      include: {
        contacts: true,
        consignees: {
          include: {
            contacts: true,
          },
        },
        amcs: {
          include: {
            project: {
              include: {
                client: true,
                assignedTo: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    status: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
        },
        projects: {
          include: {
            client: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    if (!client) {
      throw notFound('Client not found.');
    }

    res.json({
      ...serializeClient({
        id: client.id,
        name: client.name,
        industry: client.industry,
        status: client.status,
        createdAt: client.createdAt,
      }),
      contacts: client.contacts,
      consignees: client.consignees,
      amcs: client.amcs.map((amc) => serializeAmc(amc)),
      projects: client.projects.map((project) => serializeProject(project)),
    });
  }),
);

router.post(
  '/',
  requireRole(Role.PM),
  validate(createClientSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof createClientSchema>;
    const client = await prisma.client.create({
      data: {
        name: payload.name,
        industry: payload.industry,
        status: payload.status ?? ClientStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        industry: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json(serializeClient(client));
  }),
);

router.patch(
  '/:id',
  requireRole(Role.PM),
  validate(updateClientSchema),
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const payload = req.body as z.infer<typeof updateClientSchema>;
    const client = await prisma.client.update({
      where: {
        id: clientId,
      },
      data: payload,
      select: {
        id: true,
        name: true,
        industry: true,
        status: true,
        createdAt: true,
      },
    });

    res.json(serializeClient(client));
  }),
);

router.delete(
  '/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const [contactCount, consigneeCount, amcCount, projectCount] = await Promise.all([
      prisma.clientContact.count({
        where: {
          clientId,
        },
      }),
      prisma.consignee.count({
        where: {
          clientId,
        },
      }),
      prisma.amc.count({
        where: {
          clientId,
        },
      }),
      prisma.project.count({
        where: {
          clientId,
        },
      }),
    ]);

    const blockers = {
      contacts: contactCount,
      consignees: consigneeCount,
      amcs: amcCount,
      projects: projectCount,
    };

    if (Object.values(blockers).some((count) => count > 0)) {
      throw conflict('Delete blocked: remove linked contacts, consignees, AMCs, and projects first.', blockers);
    }

    await prisma.client.delete({
      where: {
        id: clientId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
```

## File: Backend/src/routes/consigneeContacts.ts
```typescript
import { Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, parseId, notFound } from '../utils/http';

const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email().optional(),
  phone: z.string().trim().min(5).optional(),
  designation: z.string().trim().optional(),
});

const updateContactSchema = contactSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

router.get(
  '/consignees/:id/contacts',
  asyncHandler(async (req, res) => {
    const consigneeId = parseId(req.params.id, 'consignee id');
    const consignee = await prisma.consignee.findUnique({
      where: {
        id: consigneeId,
      },
      select: {
        id: true,
        contacts: true,
      },
    });

    if (!consignee) {
      throw notFound('Consignee not found.');
    }

    res.json(consignee.contacts);
  }),
);

router.post(
  '/consignees/:id/contacts',
  requireRole(Role.PM),
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const consigneeId = parseId(req.params.id, 'consignee id');
    const payload = req.body as z.infer<typeof contactSchema>;
    const contact = await prisma.consigneeContact.create({
      data: {
        consigneeId,
        ...payload,
      },
    });

    res.status(201).json(contact);
  }),
);

router.patch(
  '/consignee-contacts/:id',
  requireRole(Role.PM),
  validate(updateContactSchema),
  asyncHandler(async (req, res) => {
    const contactId = parseId(req.params.id, 'consignee contact id');
    const payload = req.body as z.infer<typeof updateContactSchema>;
    const contact = await prisma.consigneeContact.update({
      where: {
        id: contactId,
      },
      data: payload,
    });

    res.json(contact);
  }),
);

router.delete(
  '/consignee-contacts/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const contactId = parseId(req.params.id, 'consignee contact id');

    await prisma.consigneeContact.delete({
      where: {
        id: contactId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
```

## File: Backend/src/routes/consignees.ts
```typescript
import { Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, parseId, notFound } from '../utils/http';

const router = Router();

const consigneeSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().min(5),
});

const updateConsigneeSchema = consigneeSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

router.get(
  '/clients/:id/consignees',
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
      },
      select: {
        id: true,
        consignees: {
          include: {
            contacts: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    if (!client) {
      throw notFound('Client not found.');
    }

    res.json(client.consignees);
  }),
);

router.post(
  '/clients/:id/consignees',
  requireRole(Role.PM),
  validate(consigneeSchema),
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.id, 'client id');
    const payload = req.body as z.infer<typeof consigneeSchema>;
    const consignee = await prisma.consignee.create({
      data: {
        clientId,
        ...payload,
      },
    });

    res.status(201).json(consignee);
  }),
);

router.patch(
  '/consignees/:id',
  requireRole(Role.PM),
  validate(updateConsigneeSchema),
  asyncHandler(async (req, res) => {
    const consigneeId = parseId(req.params.id, 'consignee id');
    const payload = req.body as z.infer<typeof updateConsigneeSchema>;
    const consignee = await prisma.consignee.update({
      where: {
        id: consigneeId,
      },
      data: payload,
      include: {
        contacts: true,
      },
    });

    res.json(consignee);
  }),
);

router.delete(
  '/consignees/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const consigneeId = parseId(req.params.id, 'consignee id');

    await prisma.consignee.delete({
      where: {
        id: consigneeId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
```

## File: Backend/src/routes/dashboard.ts
```typescript
import { Role, TicketStatus } from '@prisma/client';
import { Router } from 'express';

import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/http';

const router = Router();

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const user = req.user!;

    if (user.role === Role.PM) {
      const [totalClients, totalProjects, totalOpenTickets, totalResolvedTickets, totalRunbooks] = await Promise.all([
        prisma.client.count(),
        prisma.project.count(),
        prisma.ticket.count({
          where: {
            status: {
              not: TicketStatus.RESOLVED,
            },
          },
        }),
        prisma.ticket.count({
          where: {
            status: TicketStatus.RESOLVED,
          },
        }),
        prisma.runbook.count(),
      ]);

      return res.json({
        role: user.role,
        totalClients,
        totalProjects,
        totalOpenTickets,
        totalResolvedTickets,
        totalRunbooks,
      });
    }

    if (user.role === Role.PL) {
      const [openTickets, resolvedTickets, totalDocs, totalFaqs] = await Promise.all([
        prisma.ticket.count({
          where: {
            project: {
              assignedToId: user.id,
            },
            status: {
              not: TicketStatus.RESOLVED,
            },
          },
        }),
        prisma.ticket.count({
          where: {
            project: {
              assignedToId: user.id,
            },
            status: TicketStatus.RESOLVED,
          },
        }),
        prisma.projectDoc.count({
          where: {
            project: {
              assignedToId: user.id,
            },
          },
        }),
        prisma.faq.count({
          where: {
            project: {
              assignedToId: user.id,
            },
          },
        }),
      ]);

      return res.json({
        role: user.role,
        openTickets,
        resolvedTickets,
        totalDocs,
        totalFaqs,
      });
    }

    const [unassignedTickets, myOpenTickets, myResolvedTickets] = await Promise.all([
      prisma.ticket.count({
        where: {
          assignedToId: null,
          status: {
            not: TicketStatus.RESOLVED,
          },
        },
      }),
      prisma.ticket.count({
        where: {
          assignedToId: user.id,
          status: {
            not: TicketStatus.RESOLVED,
          },
        },
      }),
      prisma.ticket.count({
        where: {
          assignedToId: user.id,
          status: TicketStatus.RESOLVED,
        },
      }),
    ]);

    return res.json({
      role: user.role,
      unassignedTickets,
      myOpenTickets,
      myResolvedTickets,
    });
  }),
);

export default router;
```

## File: Backend/src/routes/faqs.ts
```typescript
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { assertProjectAccess } from '../utils/access';
import { asyncHandler, parseId, notFound } from '../utils/http';

const router = Router();

const createFaqSchema = z.object({
  question: z.string().trim().min(5),
  answer: z.string().trim().min(5),
  sortOrder: z.number().int().nonnegative().optional(),
});

const updateFaqSchema = createFaqSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

router.get(
  '/projects/:id/faqs',
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');
    await assertProjectAccess(req.user!, projectId);
    const faqs = await prisma.faq.findMany({
      where: {
        projectId,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    res.json(faqs);
  }),
);

router.post(
  '/projects/:id/faqs',
  validate(createFaqSchema),
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');
    await assertProjectAccess(req.user!, projectId);
    const payload = req.body as z.infer<typeof createFaqSchema>;
    const faq = await prisma.faq.create({
      data: {
        projectId,
        question: payload.question,
        answer: payload.answer,
        sortOrder: payload.sortOrder ?? 0,
      },
    });

    res.status(201).json(faq);
  }),
);

router.patch(
  '/faqs/:id',
  validate(updateFaqSchema),
  asyncHandler(async (req, res) => {
    const faqId = parseId(req.params.id, 'faq id');
    const payload = req.body as z.infer<typeof updateFaqSchema>;
    const existingFaq = await prisma.faq.findUnique({
      where: {
        id: faqId,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!existingFaq) {
      throw notFound('FAQ not found.');
    }

    await assertProjectAccess(req.user!, existingFaq.projectId);

    const faq = await prisma.faq.update({
      where: {
        id: faqId,
      },
      data: payload,
    });

    res.json(faq);
  }),
);

router.delete(
  '/faqs/:id',
  asyncHandler(async (req, res) => {
    const faqId = parseId(req.params.id, 'faq id');
    const existingFaq = await prisma.faq.findUnique({
      where: {
        id: faqId,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!existingFaq) {
      throw notFound('FAQ not found.');
    }

    await assertProjectAccess(req.user!, existingFaq.projectId);

    await prisma.faq.delete({
      where: {
        id: faqId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
```

## File: Backend/src/routes/projectDocs.ts
```typescript
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { assertProjectAccess } from '../utils/access';
import { asyncHandler, parseId, notFound } from '../utils/http';
import { serializeUser } from '../utils/serializers';

const router = Router();

const createDocSchema = z.object({
  title: z.string().trim().min(2),
  content: z.string().trim().min(10),
});

const updateDocSchema = createDocSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

const docInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  },
} as const;

router.get(
  '/projects/:id/docs',
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');
    await assertProjectAccess(req.user!, projectId);
    const docs = await prisma.projectDoc.findMany({
      where: {
        projectId,
      },
      include: docInclude,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json(
      docs.map((doc) => ({
        ...doc,
        createdBy: serializeUser(doc.createdBy),
      })),
    );
  }),
);

router.post(
  '/projects/:id/docs',
  validate(createDocSchema),
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');
    await assertProjectAccess(req.user!, projectId);
    const payload = req.body as z.infer<typeof createDocSchema>;
    const doc = await prisma.projectDoc.create({
      data: {
        projectId,
        title: payload.title,
        content: payload.content,
        createdById: req.user!.id,
      },
      include: docInclude,
    });

    res.status(201).json({
      ...doc,
      createdBy: serializeUser(doc.createdBy),
    });
  }),
);

router.patch(
  '/docs/:id',
  validate(updateDocSchema),
  asyncHandler(async (req, res) => {
    const docId = parseId(req.params.id, 'doc id');
    const payload = req.body as z.infer<typeof updateDocSchema>;
    const existingDoc = await prisma.projectDoc.findUnique({
      where: {
        id: docId,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!existingDoc) {
      throw notFound('Project document not found.');
    }

    await assertProjectAccess(req.user!, existingDoc.projectId);

    const doc = await prisma.projectDoc.update({
      where: {
        id: docId,
      },
      data: payload,
      include: docInclude,
    });

    res.json({
      ...doc,
      createdBy: serializeUser(doc.createdBy),
    });
  }),
);

router.delete(
  '/docs/:id',
  asyncHandler(async (req, res) => {
    const docId = parseId(req.params.id, 'doc id');
    const existingDoc = await prisma.projectDoc.findUnique({
      where: {
        id: docId,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!existingDoc) {
      throw notFound('Project document not found.');
    }

    await assertProjectAccess(req.user!, existingDoc.projectId);

    await prisma.projectDoc.delete({
      where: {
        id: docId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
```

## File: Backend/src/routes/projects.ts
```typescript
import { ProjectStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { assertProjectAccess, projectScopeForUser } from '../utils/access';
import { asyncHandler, badRequest, conflict, parseId, notFound } from '../utils/http';
import { serializeProject } from '../utils/serializers';
import { generateWidgetKey } from '../utils/widgetKey';

const router = Router();

const createProjectSchema = z.object({
  clientId: z.number().int().positive(),
  assignedToId: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

const updateProjectSchema = createProjectSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

const projectInclude = {
  client: true,
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  },
} as const;

const assertProjectLead = async (assignedToId: number | null | undefined) => {
  if (!assignedToId) {
    return;
  }

  const projectLead = await prisma.user.findFirst({
    where: {
      id: assignedToId,
      role: Role.PL,
    },
    select: {
      id: true,
    },
  });

  if (!projectLead) {
    throw badRequest('assignedToId must reference a project lead.');
  }
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const projects = await prisma.project.findMany({
      where: projectScopeForUser(req.user!),
      include: projectInclude,
      orderBy: {
        id: 'asc',
      },
    });

    res.json(projects.map((project) => serializeProject(project)));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');
    await assertProjectAccess(req.user!, projectId);
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: projectInclude,
    });

    if (!project) {
      throw notFound('Project not found.');
    }

    res.json(serializeProject(project));
  }),
);

router.post(
  '/',
  requireRole(Role.PM),
  validate(createProjectSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof createProjectSchema>;
    await assertProjectLead(payload.assignedToId);
    const project = await prisma.project.create({
      data: {
        clientId: payload.clientId,
        assignedToId: payload.assignedToId ?? null,
        name: payload.name,
        description: payload.description,
        widgetKey: await generateWidgetKey(),
        status: payload.status ?? ProjectStatus.ACTIVE,
      },
      include: projectInclude,
    });

    res.status(201).json(serializeProject(project));
  }),
);

router.patch(
  '/:id',
  requireRole(Role.PM),
  validate(updateProjectSchema),
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');
    const payload = req.body as z.infer<typeof updateProjectSchema>;
    await assertProjectLead(payload.assignedToId);
    const project = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: payload,
      include: projectInclude,
    });

    res.json(serializeProject(project));
  }),
);

router.delete(
  '/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const projectId = parseId(req.params.id, 'project id');
    const [ticketCount, docCount, faqCount, chatSessionCount, amcCount] = await Promise.all([
      prisma.ticket.count({
        where: {
          projectId,
        },
      }),
      prisma.projectDoc.count({
        where: {
          projectId,
        },
      }),
      prisma.faq.count({
        where: {
          projectId,
        },
      }),
      prisma.chatSession.count({
        where: {
          projectId,
        },
      }),
      prisma.amc.count({
        where: {
          projectId,
        },
      }),
    ]);

    const blockers = {
      tickets: ticketCount,
      docs: docCount,
      faqs: faqCount,
      chatSessions: chatSessionCount,
      amcs: amcCount,
    };

    if (Object.values(blockers).some((count) => count > 0)) {
      throw conflict('Delete blocked: remove linked tickets, docs, FAQs, chat sessions, and AMCs first.', blockers);
    }

    await prisma.project.delete({
      where: {
        id: projectId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
```

## File: Backend/src/routes/reports.ts
```typescript
import { TicketStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { assertProjectAccess, ticketScopeForUser } from '../utils/access';
import { asyncHandler } from '../utils/http';
import { serializeTicket } from '../utils/serializers';

const router = Router();

const optionalDateSchema = z
  .string()
  .optional()
  .transform((value) => (value ? new Date(value) : undefined))
  .refine((value) => !value || !Number.isNaN(value.getTime()), {
    message: 'Invalid date.',
  });

const reportQuerySchema = z
  .object({
    projectId: z.coerce.number().int().positive().optional(),
    status: z.nativeEnum(TicketStatus).optional(),
    from: optionalDateSchema,
    to: optionalDateSchema,
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'from must be before to.',
  });

router.get(
  '/tickets',
  validate(reportQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { projectId, status, from, to } = req.query as unknown as z.infer<typeof reportQuerySchema>;

    if (projectId) {
      await assertProjectAccess(req.user!, projectId);
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        ...ticketScopeForUser(req.user!),
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        project: {
          include: {
            client: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(tickets.map((ticket) => serializeTicket(ticket)));
  }),
);

export default router;
```

## File: Backend/src/routes/runbooks.ts
```typescript
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { asyncHandler, parseId, notFound } from '../utils/http';
import { serializeRunbook } from '../utils/serializers';

const router = Router();

const createRunbookSchema = z.object({
  title: z.string().trim().min(2),
  content: z.string().trim().min(10),
  category: z.string().trim().optional(),
});

const updateRunbookSchema = createRunbookSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

const runbookInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  },
} as const;

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const runbooks = await prisma.runbook.findMany({
      include: runbookInclude,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json(runbooks.map((runbook) => serializeRunbook(runbook)));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const runbookId = parseId(req.params.id, 'runbook id');
    const runbook = await prisma.runbook.findUnique({
      where: {
        id: runbookId,
      },
      include: runbookInclude,
    });

    if (!runbook) {
      throw notFound('Runbook not found.');
    }

    res.json(serializeRunbook(runbook));
  }),
);

router.post(
  '/',
  validate(createRunbookSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof createRunbookSchema>;
    const runbook = await prisma.runbook.create({
      data: {
        title: payload.title,
        content: payload.content,
        category: payload.category,
        createdById: req.user!.id,
      },
      include: runbookInclude,
    });

    res.status(201).json(serializeRunbook(runbook));
  }),
);

router.patch(
  '/:id',
  validate(updateRunbookSchema),
  asyncHandler(async (req, res) => {
    const runbookId = parseId(req.params.id, 'runbook id');
    const payload = req.body as z.infer<typeof updateRunbookSchema>;
    const runbook = await prisma.runbook.update({
      where: {
        id: runbookId,
      },
      data: payload,
      include: runbookInclude,
    });

    res.json(serializeRunbook(runbook));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const runbookId = parseId(req.params.id, 'runbook id');

    await prisma.runbook.delete({
      where: {
        id: runbookId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
```

## File: Backend/src/routes/ticketMessages.ts
```typescript
import { MessageType, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { assertTicketAccess } from '../utils/access';
import { asyncHandler, parseId } from '../utils/http';
import { serializeTicketMessage } from '../utils/serializers';

const router = Router();

const createTicketMessageSchema = z.object({
  content: z.string().trim().min(1),
  type: z.enum([MessageType.REPLY, MessageType.INTERNAL_NOTE]).default(MessageType.REPLY),
});

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

router.get(
  '/tickets/:id/messages',
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const messages = await prisma.ticketMessage.findMany({
      where: {
        ticketId,
      },
      include: {
        user: {
          select: safeUserSelect,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json(messages.map((message) => serializeTicketMessage(message)));
  }),
);

router.post(
  '/tickets/:id/messages',
  requireRole(Role.SE, Role.PL),
  validate(createTicketMessageSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof createTicketMessageSchema>;
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: req.user!.id,
        content: payload.content,
        type: payload.type,
      },
      include: {
        user: {
          select: safeUserSelect,
        },
      },
    });

    res.status(201).json(serializeTicketMessage(message));
  }),
);

export default router;
```

## File: Backend/src/routes/tickets.ts
```typescript
import { MessageType, Role, TicketPriority, TicketStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { createWidgetTicket } from '../services/tickets';
import { assertTicketAccess, ticketScopeForUser } from '../utils/access';
import { asyncHandler, badRequest, forbidden, notFound, parseId } from '../utils/http';
import { serializeChatSession, serializeTicket, serializeTicketMessage } from '../utils/serializers';

const router = Router();

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

const publicCreateTicketSchema = z.object({
  widgetKey: z.string().min(1),
  sessionId: z.number().int().positive().optional(),
  name: z.string().trim().min(2),
  email: z.string().email(),
  title: z.string().trim().min(3),
  description: z.string().trim().optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
});

const updateTicketSchema = z
  .object({
    title: z.string().trim().min(3).optional(),
    description: z.string().trim().min(3).optional(),
    priority: z.nativeEnum(TicketPriority).optional(),
    status: z.nativeEnum(TicketStatus).optional(),
    assignedToId: z.number().int().positive().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

const listInclude = {
  project: {
    include: {
      client: true,
      assignedTo: {
        select: safeUserSelect,
      },
    },
  },
  assignedTo: {
    select: safeUserSelect,
  },
} as const;

router.post(
  '/',
  validate(publicCreateTicketSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof publicCreateTicketSchema>;
    const ticket = await createWidgetTicket(payload);
    res.status(201).json(serializeTicket(ticket));
  }),
);

router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const tickets = await prisma.ticket.findMany({
      where: ticketScopeForUser(req.user!),
      include: listInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(tickets.map((ticket) => serializeTicket(ticket)));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      include: {
        ...listInclude,
        messages: {
          include: {
            user: {
              select: safeUserSelect,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        chatSession: {
          include: {
            project: {
              include: {
                client: true,
                assignedTo: {
                  select: safeUserSelect,
                },
              },
            },
            messages: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw notFound('Ticket not found.');
    }

    res.json({
      ...serializeTicket(ticket),
      messages: ticket.messages.map((message) => serializeTicketMessage(message)),
      chatSession: ticket.chatSession ? serializeChatSession(ticket.chatSession) : null,
    });
  }),
);

router.patch(
  '/:id',
  requireRole(Role.SE, Role.PL),
  validate(updateTicketSchema),
  asyncHandler(async (req, res) => {
    const ticketId = parseId(req.params.id, 'ticket id');
    await assertTicketAccess(req.user!, ticketId);
    const payload = req.body as z.infer<typeof updateTicketSchema>;
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      include: {
        project: {
          include: {
            client: true,
            assignedTo: {
              select: safeUserSelect,
            },
          },
        },
        assignedTo: {
          select: safeUserSelect,
        },
      },
    });

    if (!ticket) {
      throw notFound('Ticket not found.');
    }

    let assignedToId = payload.assignedToId === undefined ? ticket.assignedToId : payload.assignedToId;
    let nextStatus = payload.status ?? ticket.status;
    let resolvedAt = ticket.resolvedAt;
    const changes: string[] = [];

    if (payload.assignedToId !== undefined) {
      if (req.user!.role === Role.PL && payload.assignedToId !== null && payload.assignedToId !== req.user!.id) {
        throw forbidden('Project leads can only assign tickets to themselves.');
      }

      if (payload.assignedToId !== null) {
        const assignee = await prisma.user.findUnique({
          where: {
            id: payload.assignedToId,
          },
          select: {
            id: true,
          },
        });

        if (!assignee) {
          throw badRequest('assignedToId must reference an existing user.');
        }
      }
    }

    if (payload.status === TicketStatus.ESCALATED) {
      if (req.user!.role !== Role.SE) {
        throw forbidden('Only the support engineer can escalate tickets.');
      }

      if (!ticket.project.assignedToId) {
        throw badRequest('This project is not assigned to a project lead.');
      }

      assignedToId = ticket.project.assignedToId;
      nextStatus = TicketStatus.ESCALATED;
    }

    if (payload.status === TicketStatus.ASSIGNED && !assignedToId) {
      assignedToId = req.user!.id;
    }

    if (payload.status === TicketStatus.IN_PROGRESS && !assignedToId) {
      assignedToId = req.user!.id;
    }

    if (payload.status === TicketStatus.RESOLVED) {
      if (!assignedToId) {
        assignedToId = req.user!.id;
      }

      resolvedAt = new Date();
    } else if (payload.status !== undefined) {
      resolvedAt = null;
    }

    if (payload.status && payload.status !== ticket.status) {
      changes.push(`status changed from ${ticket.status} to ${payload.status}`);
    }

    if (assignedToId !== ticket.assignedToId) {
      changes.push(`assignee changed to ${assignedToId ?? 'unassigned'}`);
    }

    if (payload.priority && payload.priority !== ticket.priority) {
      changes.push(`priority changed from ${ticket.priority} to ${payload.priority}`);
    }

    const updatedTicket = await prisma.$transaction(async (transaction) => {
      const nextTicket = await transaction.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          ...(payload.title !== undefined ? { title: payload.title } : {}),
          ...(payload.description !== undefined ? { description: payload.description } : {}),
          ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
          ...(payload.status !== undefined ? { status: nextStatus } : {}),
          ...(assignedToId !== ticket.assignedToId ? { assignedToId } : {}),
          ...(payload.status !== undefined ? { resolvedAt } : {}),
        },
        include: listInclude,
      });

      if (changes.length > 0) {
        await transaction.ticketMessage.create({
          data: {
            ticketId,
            userId: null,
            type: MessageType.SYSTEM,
            content: changes.join('; '),
          },
        });
      }

      return nextTicket;
    });

    res.json(serializeTicket(updatedTicket));
  }),
);

export default router;
```

## File: Backend/src/routes/users.ts
```typescript
import bcrypt from 'bcrypt';
import { Role, UserStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, parseId } from '../utils/http';
import { serializeUser } from '../utils/serializers';

const router = Router();

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  status: z.nativeEnum(UserStatus).optional(),
});

const updateUserSchema = createUserSchema
  .omit({
    password: true,
  })
  .extend({
    password: z.string().min(6).optional(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: {
        id: 'asc',
      },
    });

    res.json(users.map((user) => serializeUser(user)));
  }),
);

router.post(
  '/',
  requireRole(Role.PM),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof createUserSchema>;
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        passwordHash,
        role: payload.role,
        status: payload.status ?? UserStatus.ACTIVE,
      },
      select: userSelect,
    });

    res.status(201).json(serializeUser(user));
  }),
);

router.patch(
  '/:id',
  requireRole(Role.PM),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const userId = parseId(req.params.id, 'user id');
    const payload = req.body as z.infer<typeof updateUserSchema>;
    const data: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      data.name = payload.name;
    }

    if (payload.email !== undefined) {
      data.email = payload.email.toLowerCase();
    }

    if (payload.role !== undefined) {
      data.role = payload.role;
    }

    if (payload.status !== undefined) {
      data.status = payload.status;
    }

    if (payload.password !== undefined) {
      data.passwordHash = await bcrypt.hash(payload.password, 10);
    }

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data,
      select: userSelect,
    });

    res.json(serializeUser(user));
  }),
);

router.delete(
  '/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const userId = parseId(req.params.id, 'user id');

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
```

## File: Backend/src/routes/widget.ts
```typescript
import { ChatRole, ChatSessionStatus, TicketPriority } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { generateJuliaReply } from '../services/julia';
import { createWidgetTicket } from '../services/tickets';
import { asyncHandler, badRequest, notFound, parseId } from '../utils/http';
import { serializeTicket } from '../utils/serializers';

const router = Router();

const startChatSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
});

const chatMessageSchema = z.object({
  sessionId: z.number().int().positive(),
  message: z.string().trim().min(1),
});

const escalateSchema = z.object({
  sessionId: z.number().int().positive().optional(),
  name: z.string().trim().min(2),
  email: z.string().email(),
  title: z.string().trim().min(3),
  description: z.string().trim().optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
});

const getProjectByWidgetKey = async (widgetKey: string) => {
  const project = await prisma.project.findUnique({
    where: {
      widgetKey,
    },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  if (!project) {
    throw notFound('Widget project not found.');
  }

  if (project.status !== 'ACTIVE') {
    throw badRequest('This widget is not active.');
  }

  return project;
};

router.get(
  '/:widgetKey/faqs',
  asyncHandler(async (req, res) => {
    const project = await getProjectByWidgetKey(req.params.widgetKey);
    const faqs = await prisma.faq.findMany({
      where: {
        projectId: project.id,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    res.json({
      project,
      faqs,
    });
  }),
);

router.post(
  '/:widgetKey/chat/start',
  validate(startChatSchema),
  asyncHandler(async (req, res) => {
    const project = await getProjectByWidgetKey(req.params.widgetKey);
    const payload = req.body as z.infer<typeof startChatSchema>;
    const chatSession = await prisma.chatSession.create({
      data: {
        projectId: project.id,
        clientName: payload.name,
        clientEmail: payload.email,
        status: ChatSessionStatus.ACTIVE,
      },
    });

    res.status(201).json({
      sessionId: chatSession.id,
    });
  }),
);

router.post(
  '/:widgetKey/chat/message',
  validate(chatMessageSchema),
  asyncHandler(async (req, res) => {
    const project = await getProjectByWidgetKey(req.params.widgetKey);
    const payload = req.body as z.infer<typeof chatMessageSchema>;
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: payload.sessionId,
        projectId: project.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!chatSession) {
      throw notFound('Chat session not found.');
    }

    if (chatSession.status !== ChatSessionStatus.ACTIVE) {
      throw badRequest('This chat session is no longer active.');
    }

    await prisma.chatMessage.create({
      data: {
        chatSessionId: chatSession.id,
        role: ChatRole.USER,
        content: payload.message,
      },
    });

    const conversation = await prisma.chatMessage.findMany({
      where: {
        chatSessionId: chatSession.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const reply = await generateJuliaReply(project.id, conversation.map((message) => ({ role: message.role, content: message.content })));

    const juliaMessage = await prisma.chatMessage.create({
      data: {
        chatSessionId: chatSession.id,
        role: ChatRole.JULIA,
        content: reply,
      },
    });

    res.json({
      sessionId: chatSession.id,
      reply,
      message: juliaMessage,
    });
  }),
);

router.post(
  '/:widgetKey/escalate',
  validate(escalateSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof escalateSchema>;
    const ticket = await createWidgetTicket({
      widgetKey: req.params.widgetKey,
      sessionId: payload.sessionId,
      name: payload.name,
      email: payload.email,
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
    });

    res.status(201).json(serializeTicket(ticket));
  }),
);

router.get(
  '/:widgetKey/chat/:sessionId',
  asyncHandler(async (req, res) => {
    const project = await getProjectByWidgetKey(req.params.widgetKey);
    const sessionId = parseId(req.params.sessionId, 'session id');
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        projectId: project.id,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!chatSession) {
      throw notFound('Chat session not found.');
    }

    res.json(chatSession);
  }),
);

export default router;
```

## File: Backend/src/services/julia.ts
```typescript
import { ChatRole } from '@prisma/client';
import Groq from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';

import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { AppError, notFound } from '../utils/http';

type ConversationMessage = {
  role: ChatRole;
  content: string;
};

const MAX_CONTEXT_CHARS = 14_000;

const truncateContext = (value: string) => (value.length > MAX_CONTEXT_CHARS ? `${value.slice(0, MAX_CONTEXT_CHARS)}...` : value);

const buildContextSection = (label: string, items: Array<{ title: string; content: string }>) => {
  if (!items.length) {
    return `${label}:\n- None available`;
  }

  return `${label}:\n${items
    .map((item, index) => `- ${index + 1}. ${item.title}\n${truncateContext(item.content)}`)
    .join('\n\n')}`;
};

export const generateJuliaReply = async (projectId: number, conversation: ConversationMessage[]) => {
  if (!env.GROQ_API_KEY) {
    throw new AppError(500, 'GROQ_API_KEY is not configured for Julia AI.');
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      docs: {
        orderBy: {
          updatedAt: 'desc',
        },
      },
    },
  });

  if (!project) {
    throw notFound('Project not found.');
  }

  const runbooks = await prisma.runbook.findMany({
    orderBy: {
      updatedAt: 'desc',
    },
    take: 10,
  });

  const systemPrompt = [
    `You are Julia, the support assistant for the "${project.name}" project.`,
    'Answer using only the provided project context when possible.',
    'If the context is insufficient, say that you are not certain and recommend escalating to a human.',
    'Keep answers concise, practical, and suitable for an IT support widget.',
    buildContextSection(
      'Project Documents',
      project.docs.map((doc) => ({
        title: doc.title,
        content: doc.content,
      })),
    ),
    buildContextSection(
      'Runbooks',
      runbooks.map((runbook) => ({
        title: runbook.title,
        content: runbook.content,
      })),
    ),
  ].join('\n\n');

  const client = new Groq({
    apiKey: env.GROQ_API_KEY,
  });

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...conversation.map<ChatCompletionMessageParam>((message) =>
      message.role === ChatRole.USER
        ? {
            role: 'user',
            content: message.content,
          }
        : {
            role: 'assistant',
            content: message.content,
          },
    ),
  ];

  const completion = await client.chat.completions.create({
    model: env.GROQ_MODEL,
    temperature: 0.2,
    max_completion_tokens: 500,
    messages,
  });

  const content = completion.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new AppError(502, 'Julia AI did not return a response.');
  }

  return content;
};
```

## File: Backend/src/services/tickets.ts
```typescript
import { ChatSessionStatus, MessageType, TicketPriority, TicketStatus } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { badRequest, notFound } from '../utils/http';

type CreateWidgetTicketInput = {
  widgetKey: string;
  sessionId?: number;
  name: string;
  email: string;
  title: string;
  description?: string;
  priority?: TicketPriority;
};

export const createWidgetTicket = async (input: CreateWidgetTicketInput) => {
  const project = await prisma.project.findUnique({
    where: {
      widgetKey: input.widgetKey,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!project) {
    throw notFound('Project not found.');
  }

  const chatSession = input.sessionId
    ? await prisma.chatSession.findFirst({
        where: {
          id: input.sessionId,
          projectId: project.id,
        },
        include: {
          ticket: true,
          messages: {
            where: {
              role: 'USER',
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          },
        },
      })
    : null;

  if (input.sessionId && !chatSession) {
    throw notFound('Chat session not found.');
  }

  if (chatSession?.ticket) {
    throw badRequest('A ticket already exists for this chat session.');
  }

  const fallbackDescription = chatSession?.messages
    .map((message) => message.content)
    .reverse()
    .join('\n\n');

  return prisma.$transaction(async (transaction) => {
    if (chatSession) {
      await transaction.chatSession.update({
        where: {
          id: chatSession.id,
        },
        data: {
          clientName: input.name,
          clientEmail: input.email,
          status: ChatSessionStatus.ESCALATED,
          endedAt: new Date(),
        },
      });
    }

    const ticket = await transaction.ticket.create({
      data: {
        projectId: project.id,
        chatSessionId: chatSession?.id,
        title: input.title,
        description: input.description?.trim() || fallbackDescription || `Support request for ${project.name}.`,
        priority: input.priority ?? TicketPriority.MEDIUM,
        status: TicketStatus.NEW,
      },
      include: {
        project: {
          include: {
            client: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    await transaction.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: null,
        type: MessageType.SYSTEM,
        content: `Ticket created from widget escalation for ${input.name} (${input.email}).`,
      },
    });

    return ticket;
  });
};
```

## File: Backend/src/types/auth.ts
```typescript
import type { Role, UserStatus } from '@prisma/client';

export type AuthenticatedUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
};
```

## File: Backend/src/types/express.d.ts
```typescript
import type { AuthenticatedUser } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
```

## File: Backend/src/utils/access.ts
```typescript
import { Role } from '@prisma/client';

import { prisma } from '../lib/prisma';
import type { AuthenticatedUser } from '../types/auth';
import { forbidden } from './http';

export const projectScopeForUser = (user: AuthenticatedUser) =>
  user.role === Role.PL ? { assignedToId: user.id } : {};

export const ticketScopeForUser = (user: AuthenticatedUser) =>
  user.role === Role.PL
    ? {
        project: {
          assignedToId: user.id,
        },
      }
    : {};

export const chatSessionScopeForUser = (user: AuthenticatedUser) =>
  user.role === Role.PL
    ? {
        project: {
          assignedToId: user.id,
        },
      }
    : {};

export const assertProjectAccess = async (user: AuthenticatedUser, projectId: number) => {
  if (user.role !== Role.PL) {
    return;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      assignedToId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    throw forbidden('You do not have access to this project.');
  }
};

export const assertTicketAccess = async (user: AuthenticatedUser, ticketId: number) => {
  if (user.role !== Role.PL) {
    return;
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      project: {
        assignedToId: user.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (!ticket) {
    throw forbidden('You do not have access to this ticket.');
  }
};

export const assertChatSessionAccess = async (user: AuthenticatedUser, chatSessionId: number) => {
  if (user.role !== Role.PL) {
    return;
  }

  const chatSession = await prisma.chatSession.findFirst({
    where: {
      id: chatSessionId,
      project: {
        assignedToId: user.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (!chatSession) {
    throw forbidden('You do not have access to this chat session.');
  }
};
```

## File: Backend/src/utils/http.ts
```typescript
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (handler: AsyncRequestHandler): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };

export const badRequest = (message: string, details?: unknown) => new AppError(400, message, details);
export const conflict = (message: string, details?: unknown) => new AppError(409, message, details);
export const unauthorized = (message = 'Unauthorized') => new AppError(401, message);
export const forbidden = (message = 'Forbidden') => new AppError(403, message);
export const notFound = (message = 'Not found') => new AppError(404, message);

export const parseId = (value: string, label = 'id') => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw badRequest(`Invalid ${label}.`);
  }

  return id;
};
```

## File: Backend/src/utils/idPrefix.ts
```typescript
const DEFAULT_WIDTH = 3;

export const formatDisplayId = (prefix: string, id: number, width = DEFAULT_WIDTH) =>
  `${prefix}-${id.toString().padStart(width, '0')}`;

export const withDisplayId = <T extends { id: number }>(record: T, prefix: string) => ({
  ...record,
  displayId: formatDisplayId(prefix, record.id),
});
```

## File: Backend/src/utils/serializers.ts
```typescript
import { withDisplayId } from './idPrefix';

type AnyRecord = {
  id: number;
  [key: string]: unknown;
};

const withoutPasswordHash = (record: AnyRecord) => {
  const { passwordHash, ...safeRecord } = record;
  return safeRecord;
};

export const serializeUser = <T extends AnyRecord | null | undefined>(user: T) => {
  if (!user) {
    return null;
  }

  return withDisplayId(withoutPasswordHash(user), 'USR');
};

export const serializeClient = <T extends AnyRecord | null | undefined>(client: T) => {
  if (!client) {
    return null;
  }

  return withDisplayId(client, 'CLT');
};

export const serializeProject = <T extends AnyRecord | null | undefined>(project: T) => {
  if (!project) {
    return null;
  }

  const nextProject: Record<string, unknown> = {
    ...withDisplayId(project, 'PRJ'),
  };

  if ('client' in project) {
    nextProject.client = serializeClient(project.client as AnyRecord | null | undefined);
  }

  if ('assignedTo' in project) {
    nextProject.assignedTo = serializeUser(project.assignedTo as AnyRecord | null | undefined);
  }

  return nextProject;
};

export const serializeAmc = <T extends AnyRecord | null | undefined>(amc: T) => {
  if (!amc) {
    return null;
  }

  const nextAmc: Record<string, unknown> = {
    ...withDisplayId(amc, 'AMC'),
  };

  if ('project' in amc) {
    nextAmc.project = serializeProject(amc.project as AnyRecord | null | undefined);
  }

  return nextAmc;
};

export const serializeRunbook = <T extends AnyRecord | null | undefined>(runbook: T) => {
  if (!runbook) {
    return null;
  }

  const nextRunbook: Record<string, unknown> = {
    ...withDisplayId(runbook, 'RB'),
  };

  if ('createdBy' in runbook) {
    nextRunbook.createdBy = serializeUser(runbook.createdBy as AnyRecord | null | undefined);
  }

  return nextRunbook;
};

export const serializeTicket = <T extends AnyRecord | null | undefined>(ticket: T) => {
  if (!ticket) {
    return null;
  }

  const nextTicket: Record<string, unknown> = {
    ...withDisplayId(ticket, 'TKT'),
  };

  if ('project' in ticket) {
    nextTicket.project = serializeProject(ticket.project as AnyRecord | null | undefined);
  }

  if ('assignedTo' in ticket) {
    nextTicket.assignedTo = serializeUser(ticket.assignedTo as AnyRecord | null | undefined);
  }

  return nextTicket;
};

export const serializeTicketMessage = <T extends AnyRecord | null | undefined>(message: T) => {
  if (!message) {
    return null;
  }

  const nextMessage: Record<string, unknown> = { ...message };

  if ('user' in message) {
    nextMessage.user = serializeUser(message.user as AnyRecord | null | undefined);
  }

  return nextMessage;
};

export const serializeChatSession = <T extends AnyRecord | null | undefined>(chatSession: T) => {
  if (!chatSession) {
    return null;
  }

  const nextChatSession: Record<string, unknown> = { ...chatSession };

  if ('project' in chatSession) {
    nextChatSession.project = serializeProject(chatSession.project as AnyRecord | null | undefined);
  }

  if ('ticket' in chatSession) {
    nextChatSession.ticket = serializeTicket(chatSession.ticket as AnyRecord | null | undefined);
  }

  return nextChatSession;
};
```

## File: Backend/src/utils/widgetKey.ts
```typescript
import { randomBytes } from 'node:crypto';

import { prisma } from '../lib/prisma';

export const generateWidgetKey = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = randomBytes(18).toString('base64url');
    const existingProject = await prisma.project.findUnique({
      where: {
        widgetKey: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existingProject) {
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique widget key.');
};
```

## File: Backend/src/index.ts
```typescript
import { Prisma } from '@prisma/client';
import cors from 'cors';
import express from 'express';
import { ZodError } from 'zod';

import { env } from './config/env';
import { prisma } from './lib/prisma';
import { authMiddleware } from './middleware/auth';
import { AppError } from './utils/http';
import amcsRouter from './routes/amcs';
import authRouter from './routes/auth';
import chatSessionsRouter from './routes/chatSessions';
import clientContactsRouter from './routes/clientContacts';
import clientsRouter from './routes/clients';
import consigneeContactsRouter from './routes/consigneeContacts';
import consigneesRouter from './routes/consignees';
import dashboardRouter from './routes/dashboard';
import faqsRouter from './routes/faqs';
import projectDocsRouter from './routes/projectDocs';
import projectsRouter from './routes/projects';
import reportsRouter from './routes/reports';
import runbooksRouter from './routes/runbooks';
import ticketMessagesRouter from './routes/ticketMessages';
import ticketsRouter from './routes/tickets';
import usersRouter from './routes/users';
import widgetRouter from './routes/widget';

const app = express();

const corsOrigin =
  env.CORS_ORIGIN === '*'
    ? true
    : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/widget', widgetRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/clients', authMiddleware, clientsRouter);
app.use('/api/projects', authMiddleware, projectsRouter);
app.use('/api/runbooks', authMiddleware, runbooksRouter);
app.use('/api/chat-sessions', authMiddleware, chatSessionsRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/reports', authMiddleware, reportsRouter);
app.use('/api', authMiddleware, clientContactsRouter);
app.use('/api', authMiddleware, consigneesRouter);
app.use('/api', authMiddleware, consigneeContactsRouter);
app.use('/api', authMiddleware, amcsRouter);
app.use('/api', authMiddleware, projectDocsRouter);
app.use('/api', authMiddleware, faqsRouter);
app.use('/api', authMiddleware, ticketMessagesRouter);

app.use((_req, res) => {
  res.status(404).json({
    message: 'Route not found.',
  });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed.',
      details: error.flatten(),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'A unique constraint was violated.',
        details: error.meta,
      });
    }

    if (error.code === 'P2003') {
      return res.status(409).json({
        message: 'Operation blocked by related records.',
        details: error.meta,
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        message: 'Requested record was not found.',
      });
    }
  }

  console.error(error);

  return res.status(500).json({
    message: 'Internal server error.',
  });
});

const startServer = async () => {
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`ATC Support backend listening on port ${env.PORT}`);
  });
};

void startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});

export default app;
```

## File: Backend/.gitignore
```
node_modules/
dist
.env
coverage
.DS_Store
*.log
```

## File: Backend/package.json
```json
{
  "name": "atc-support-backend",
  "version": "1.0.0",
  "private": true,
  "description": "ATC Support backend service",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "tsx prisma/seed.ts",
    "db:setup": "prisma migrate dev && prisma db seed"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "engines": {
    "node": ">=20"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@prisma/adapter-pg": "^7.5.0",
    "@prisma/client": "^7.5.0",
    "bcrypt": "^6.0.0",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^4.21.2",
    "groq-sdk": "^1.1.1",
    "jsonwebtoken": "^9.0.3",
    "pg": "^8.20.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/bcrypt": "^6.0.0",
    "@types/cors": "^2.8.19",
    "@types/express": "^4.17.23",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^25.5.0",
    "nodemon": "^3.1.14",
    "prisma": "^7.5.0",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3"
  }
}
```

## File: Backend/prisma.config.ts
```typescript
import 'dotenv/config';

import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
```

## File: Backend/tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts"],
  "exclude": ["dist", "node_modules"]
}
```
