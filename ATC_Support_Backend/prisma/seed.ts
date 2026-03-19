import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import {
  AmcStatus,
  ChatRole,
  ChatSessionStatus,
  ClientStatus,
  KnowledgeStatus,
  MessageType,
  PrismaClient,
  ProjectStatus,
  Role,
  TicketPriority,
  TicketSource,
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
  await prisma.escalationHistory.deleteMany();
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
      address: '12 Logistics Park Road',
      city: 'Bangalore',
      phone: '080-5550-1000',
      email: 'support@acme-logistics.com',
      website: 'https://acme-logistics.example.com',
      notes: 'Priority enterprise client with warehouse and CRM workloads.',
      status: ClientStatus.ACTIVE,
      contacts: {
        create: [
          {
            name: 'Arun Shah',
            email: 'arun@acme-logistics.com',
            phone: '9876543210',
            designation: 'IT Manager',
            isPrimary: true,
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
      address: '48 Commerce Avenue',
      city: 'Mumbai',
      phone: '022-4433-1188',
      email: 'ops@beta-retail.com',
      website: 'https://beta-retail.example.com',
      notes: 'Retail billing support with reconciliation-heavy ticket volume.',
      status: ClientStatus.ACTIVE,
      contacts: {
        create: [
          {
            name: 'Karan Verma',
            email: 'karan@beta-retail.com',
            phone: '9123456789',
            designation: 'Product Owner',
            isPrimary: true,
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
        widgetEnabled: true,
        juliaGreeting: 'Hello, I am Julia. Tell me what is blocking your warehouse work right now.',
        juliaFallbackMessage: 'I am not fully certain from the available project knowledge. I can help you escalate this to a human teammate.',
        juliaEscalationHint: 'If the issue affects login, access, or stock movement, escalating is usually the fastest next step.',
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
        widgetEnabled: true,
        juliaGreeting: 'Hi, I am Julia for the CRM Dashboard project.',
        juliaFallbackMessage: 'I do not have enough CRM project context to answer confidently.',
        juliaEscalationHint: 'Escalate export and overnight batch issues to the project lead when needed.',
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
        widgetEnabled: true,
        juliaGreeting: 'Hi, I am Julia for Billing Suite support.',
        juliaFallbackMessage: 'I cannot confirm the billing fix from the current documentation.',
        juliaEscalationHint: 'Escalate reconciliation and tax mismatches when reruns do not clear the issue.',
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
        status: KnowledgeStatus.PUBLISHED,
        publishedAt: safeDate('2026-02-20T08:00:00Z'),
        createdById: se.id,
      },
      {
        title: 'Clear stuck job queue',
        content: 'Check the worker health dashboard, restart failed workers, and requeue failed jobs after reviewing error logs.',
        category: 'Operations',
        status: KnowledgeStatus.PUBLISHED,
        publishedAt: safeDate('2026-02-22T09:00:00Z'),
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
        status: KnowledgeStatus.PUBLISHED,
        publishedAt: safeDate('2026-02-25T10:00:00Z'),
        createdById: pl1.id,
      },
      {
        projectId: crmProject.id,
        title: 'CRM escalation rules',
        content: 'Sales tickets should route to the CRM project lead. Export failures usually depend on nightly job completion.',
        status: KnowledgeStatus.PUBLISHED,
        publishedAt: safeDate('2026-02-26T11:00:00Z'),
        createdById: pl2.id,
      },
      {
        projectId: billingProject.id,
        title: 'Billing reconciliation notes',
        content: 'If invoice totals do not match, confirm tax configuration and rerun the day-end reconciliation.',
        status: KnowledgeStatus.PUBLISHED,
        publishedAt: safeDate('2026-02-27T12:00:00Z'),
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
            sourceRefs: {
              runbookIds: [1],
              projectDocIds: [1],
            },
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
            sourceRefs: {
              runbookIds: [],
              projectDocIds: [3],
            },
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
      source: TicketSource.WIDGET,
      priority: TicketPriority.HIGH,
      status: TicketStatus.NEW,
    },
  });

  const assignedTicket = await prisma.ticket.create({
    data: {
      projectId: crmProject.id,
      title: 'CRM export job failed overnight',
      description: 'Daily export did not generate the expected file.',
      source: TicketSource.WIDGET,
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
      source: TicketSource.WIDGET,
      priority: TicketPriority.HIGH,
      status: TicketStatus.RESOLVED,
      assignedToId: pl3.id,
      resolutionSummary: 'Updated the tax mapping and reran reconciliation successfully.',
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

  await prisma.escalationHistory.create({
    data: {
      ticketId: newTicket.id,
      createdById: se.id,
      fromStatus: TicketStatus.NEW,
      toStatus: TicketStatus.ESCALATED,
      fromAssigneeId: null,
      toAssigneeId: pl1.id,
      note: 'Login failure persisted after password reset guidance.',
    },
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
