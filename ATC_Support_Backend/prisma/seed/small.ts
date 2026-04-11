import bcrypt from 'bcrypt';
import {
  AssignmentAuthority,
  AmcStatus,
  ChatRole,
  ChatSessionStatus,
  ClientStatus,
  HardwareAssetStatus,
  HardwareCategory,
  KnowledgeStatus,
  MessageType,
  NotificationType,
  ProjectStatus,
  Role,
  ScopeMode,
  SupportSessionMessageRole,
  SupportSessionSource,
  SupportSessionStatus,
  SupportTopicKind,
  SupportTopicScope,
  SupportLevel,
  SupportType,
  TicketEmailDirection,
  TicketEmailStatus,
  TicketPriority,
  TicketSource,
  TicketStatus,
  UserStatus,
  type PrismaClient,
} from '@prisma/client';

import {
  chance,
  cleanSeedState,
  clearOrphanedAttachmentFiles,
  createSeededRandom,
  daysAgo,
  hoursAfter,
  intBetween,
  password,
  pick,
  pickWeighted,
  slugify,
  writeSeedAttachment,
} from './utils';

const CLIENT_BLUEPRINTS = [
  {
    name: 'Acme Logistics',
    industry: 'Logistics',
    city: 'Bangalore',
    address: '12 Logistics Park Road',
    phone: '080-5550-1000',
    email: 'support@acme-logistics.com',
    website: 'https://acme-logistics.example.com',
    notes: 'Priority enterprise client with warehouse and CRM workloads.',
    primaryContact: { name: 'Arun Shah', email: 'arun@acme-logistics.com', phone: '9876543210', designation: 'IT Manager' },
    consignee: { name: 'Acme North Hub', address: 'Bangalore, Karnataka', contact: { name: 'Meera Singh', email: 'meera@acme-logistics.com', phone: '9988776655', designation: 'Operations Lead' } },
    projects: [
      { name: 'Warehouse Portal', widgetKey: 'widget_warehouse_portal', description: 'Support portal for warehouse staff and consignees.' },
      { name: 'CRM Dashboard', widgetKey: 'widget_crm_dashboard', description: 'Internal customer support CRM dashboard.' },
      { name: 'Fleet Ops Console', description: 'Dispatch and route support dashboard for fleet managers.' },
    ],
  },
  {
    name: 'Beta Retail',
    industry: 'Retail',
    city: 'Mumbai',
    address: '48 Commerce Avenue',
    phone: '022-4433-1188',
    email: 'ops@beta-retail.com',
    website: 'https://beta-retail.example.com',
    notes: 'Retail billing support with reconciliation-heavy ticket volume.',
    primaryContact: { name: 'Karan Verma', email: 'karan@beta-retail.com', phone: '9123456789', designation: 'Product Owner' },
    projects: [
      { name: 'Billing Suite', widgetKey: 'widget_billing_suite', description: 'Retail billing and reconciliation application.' },
      { name: 'Store Sync Hub', description: 'Synchronizes inventory and pricing between channels.' },
      { name: 'Loyalty Desk', description: 'Support for loyalty campaigns, vouchers, and member sync.' },
    ],
  },
  {
    name: 'CareAxis Health',
    industry: 'Healthcare',
    city: 'Hyderabad',
    address: '7 MedTech Avenue',
    phone: '040-7788-9900',
    email: 'help@careaxis-health.com',
    website: 'https://careaxis-health.example.com',
    notes: 'Handles patient intake and payer claims workflows.',
    primaryContact: { name: 'Drishti Nair', email: 'drishti@careaxis-health.com', phone: '9011223344', designation: 'Digital Ops Lead' },
    projects: [
      { name: 'Patient Intake Portal', description: 'Front-desk support tooling for new patient registration.' },
      { name: 'Claims Tracker', description: 'Claims and approval status tracker for billing teams.' },
    ],
  },
  {
    name: 'Delta Finance',
    industry: 'Fintech',
    city: 'Pune',
    address: '91 Capital Street',
    phone: '020-6611-0077',
    email: 'service@delta-finance.com',
    website: 'https://delta-finance.example.com',
    notes: 'Operationally sensitive lender workflow systems.',
    primaryContact: { name: 'Nitin Khanna', email: 'nitin@delta-finance.com', phone: '9988112233', designation: 'Operations Manager' },
    projects: [
      { name: 'Loan Origination Desk', description: 'Application intake and approval workflow support.' },
      { name: 'Collections Console', description: 'Collections and repayment operations workspace.' },
      { name: 'Audit Vault', description: 'Compliance reporting and operational audit trail portal.' },
    ],
  },
  {
    name: 'Everest Manufacturing',
    industry: 'Manufacturing',
    city: 'Chennai',
    address: '4 Foundry Lane',
    phone: '044-5522-1818',
    email: 'support@everest-mfg.com',
    website: 'https://everest-manufacturing.example.com',
    notes: 'Operations and procurement support for factory teams.',
    primaryContact: { name: 'Lavanya Iyer', email: 'lavanya@everest-mfg.com', phone: '9445566677', designation: 'Plant Systems Lead' },
    projects: [
      { name: 'Factory Floor Monitor', description: 'Production floor health and alert console.' },
      { name: 'Vendor Procurement Hub', description: 'Vendor onboarding, approvals, and PO follow-up.' },
    ],
  },
  {
    name: 'Frontier Education',
    industry: 'Education',
    city: 'Delhi',
    address: '19 Campus Ring Road',
    phone: '011-6677-2211',
    email: 'tech@frontier-education.com',
    website: 'https://frontier-education.example.com',
    notes: 'Student and admissions support applications.',
    primaryContact: { name: 'Anjali Rana', email: 'anjali@frontier-education.com', phone: '8800112233', designation: 'Program Technology Manager' },
    projects: [
      { name: 'Student Support Center', description: 'Support portal for student-facing service issues.' },
      { name: 'Admissions Workflow', description: 'Lead to admission processing workflow.' },
    ],
  },
  {
    name: 'GreenLeaf Hospitality',
    industry: 'Hospitality',
    city: 'Goa',
    address: '2 Seaside Residency',
    phone: '0832-551-0001',
    email: 'ops@greenleaf-hospitality.com',
    website: 'https://greenleaf-hospitality.example.com',
    notes: 'Hotel and property operations systems with strong seasonality.',
    primaryContact: { name: 'Harsh Kapoor', email: 'harsh@greenleaf-hospitality.com', phone: '9311223344', designation: 'Property Systems Lead' },
    projects: [
      { name: 'Booking Operations', description: 'Reservation and booking operations support.' },
      { name: 'Property Support Console', description: 'Back-office issue tracking for property managers.' },
      { name: 'Guest Feedback Hub', description: 'Feedback ingestion and service recovery workflow.' },
    ],
  },
  {
    name: 'Helio SaaS',
    industry: 'SaaS',
    city: 'Kolkata',
    address: '55 Startup Square',
    phone: '033-9911-4400',
    email: 'ops@helio-saas.com',
    website: 'https://helio-saas.example.com',
    notes: 'Cloud admin tooling and tenant operations platform.',
    primaryContact: { name: 'Soham Ghosh', email: 'soham@helio-saas.com', phone: '8899001122', designation: 'Platform Operations Lead' },
    projects: [
      { name: 'Tenant Admin Console', description: 'Tenant configuration and admin workflow console.' },
      { name: 'Incident Command Center', description: 'Internal incident handling and visibility workspace.' },
    ],
  },
] as const;

const RUNBOOK_BLUEPRINTS = [
  ['Reset user password', 'Authentication'],
  ['Unlock disabled user account', 'Authentication'],
  ['Clear stuck job queue', 'Operations'],
  ['Verify export worker health', 'Operations'],
  ['Rerun billing reconciliation safely', 'Billing'],
  ['Validate tax mapping after release', 'Billing'],
  ['Check CRM overnight batch completion', 'CRM'],
  ['Refresh warehouse access permissions', 'Warehouse'],
  ['Recover delayed webhook delivery', 'Integrations'],
  ['Review AMC overrun before escalation', 'Commercial'],
  ['Capture logs for UI rendering issues', 'Diagnostics'],
  ['Confirm email threading token mismatch', 'Email'],
] as const;

const ISSUE_TITLES = [
  'Login fails after password reset',
  'Dashboard loads blank after sign in',
  'Export job failed overnight',
  'Reconciliation mismatch for previous day',
  'User cannot see updated inventory count',
  'Attachment upload spins indefinitely',
  'Approval workflow stuck on pending',
  'Notification did not trigger for assignee',
  'Data sync between modules is delayed',
  'Email reply did not reflect on ticket',
  'Role permissions look incorrect after update',
  'Widget shows fallback too early',
] as const;

const INTERNAL_NOTE_TEMPLATES = [
  'Validated the issue scope and captured initial reproduction steps.',
  'Confirmed the impact is limited to a subset of users.',
  'Tracked the error to a recently updated workflow branch.',
  'Queued follow-up after reviewing logs and browser trace.',
  'Need one more confirmation before closing this request.',
] as const;

const AGENT_REPLY_TEMPLATES = [
  'We are checking this now and will update the ticket shortly.',
  'I found the likely root cause and I am validating the fix path.',
  'Please confirm whether the issue still reproduces after the latest retry.',
  'We have applied the first corrective step and are monitoring the result.',
  'This looks linked to configuration drift from the previous release.',
] as const;

const CUSTOMER_REPLY_TEMPLATES = [
  'I retried the workflow and the same issue is still happening.',
  'The fix helped partially, but one user still sees the problem.',
  'Sharing one more example in case it helps narrow this down.',
  'This is now blocking our live operation, please prioritize.',
  'Confirmed from our side. You can continue with the next step.',
] as const;

const ATTACHMENT_BLUEPRINTS = [
  ['error-log.txt', 'text/plain'],
  ['screenshot.png', 'image/png'],
  ['console-output.log', 'text/plain'],
  ['worker-trace.txt', 'text/plain'],
  ['browser-network.json', 'application/json'],
] as const;

const HARDWARE_BLUEPRINTS = [
  {
    category: HardwareCategory.PRINTER,
    brand: 'Honeywell',
    model: 'PC42t',
    issue: 'Printer is not printing',
    vendorSupportUrl: 'https://sps-support.honeywell.com/s/',
    notes: 'Use universal printer diagnostics first, then hand off to Honeywell model docs for error-code or print-head issues.',
  },
  {
    category: HardwareCategory.PRINTER,
    brand: 'Linx',
    model: 'TT500',
    issue: 'Label alignment is inconsistent',
    vendorSupportUrl: 'https://www.linxglobal.com/en/support',
    notes: 'Check media path, ribbon, calibration, and driver settings before escalating.',
  },
  {
    category: HardwareCategory.SCANNER,
    brand: 'Zebra',
    model: 'DS2208',
    issue: 'Scanner is not detected',
    vendorSupportUrl: 'https://www.zebra.com/us/en/support-downloads.html',
    notes: 'Check USB cable, driver mode, device manager detection, and test scan behavior.',
  },
  {
    category: HardwareCategory.NETWORK_DEVICE,
    brand: 'Cisco',
    model: 'CBS250',
    issue: 'Network device appears offline',
    vendorSupportUrl: 'https://www.cisco.com/c/en/us/support/index.html',
    notes: 'Check power, uplink, port lights, IP reachability, and safe restart before escalation.',
  },
  {
    category: HardwareCategory.COMPUTER,
    brand: 'Dell',
    model: 'OptiPlex 3090',
    issue: 'Workstation is not starting',
    vendorSupportUrl: 'https://www.dell.com/support/home',
    notes: 'Limit user-side guidance to safe power and peripheral checks. Hardware damage escalates immediately.',
  },
] as const;

const HARDWARE_PLAYBOOKS = [
  {
    title: 'Universal printer not printing flow',
    category: HardwareCategory.PRINTER,
    summary: 'Safe first-line diagnostics for thermal, label, and office printers before brand-specific escalation.',
    content:
      '1. Confirm the printer is powered on and has no unsafe smell or visible damage. 2. Confirm USB/LAN/WiFi connection and whether the device appears online. 3. Check paper, label roll, ribbon, and media path. 4. Ask for any blinking light or error code. 5. Run a test print if available. 6. If error-code, firmware, print-head, or calibration issue remains, provide vendor link and escalate.',
  },
  {
    title: 'Universal scanner not detected flow',
    category: HardwareCategory.SCANNER,
    summary: 'Basic scanner checks for power, cable, driver, and test scan behavior.',
    content:
      '1. Confirm scanner power/indicator status. 2. Check cable and port. 3. Confirm the scanner appears in the operating system/device manager. 4. Try a test scan in a known working application. 5. If not detected after cable/driver checks, escalate with model, serial number, and workstation details.',
  },
  {
    title: 'Universal network device offline flow',
    category: HardwareCategory.NETWORK_DEVICE,
    summary: 'Safe first-line checks for routers, switches, and access/network devices.',
    content:
      '1. Confirm power and status lights. 2. Confirm uplink and client cable lights. 3. Ask whether multiple users are affected. 4. Check if device IP responds. 5. Perform only approved restart steps. 6. Escalate if outage persists, config change is needed, or hardware fault is suspected.',
  },
] as const;

const SOFTWARE_TOPIC_TEMPLATES = [
  {
    title: 'How to check login and access issues',
    summary: 'Guides users through safe access checks before escalation.',
    content:
      'Ask the user to confirm username, role, browser, and whether other users can access the same screen. If a permission change or account unlock is required, escalate to support with the affected user, screen, and timestamp.',
  },
  {
    title: 'How to capture issue evidence',
    summary: 'Collects the minimum useful details for unresolved software tickets.',
    content:
      'Ask for the exact screen, action attempted, expected result, actual result, screenshot, user ID, and approximate time. Do not ask for passwords or sensitive business data. Escalate if the issue blocks production work.',
  },
  {
    title: 'How to retry stuck workflow actions',
    summary: 'Safe retry checklist for common workflow stalls.',
    content:
      'Ask the user to refresh, retry once, confirm network stability, and check whether the same action works for another user. If the workflow remains stuck, escalate with attempted steps and affected record ID.',
  },
] as const;

const buildJuliaGreeting = (projectName: string) => `Hi, I am Julia for ${projectName}. Tell me what is blocking your work and I will search the available project knowledge first.`;
const buildJuliaFallback = (projectName: string) => `I do not have enough ${projectName} context to answer confidently. I can help escalate this to the delivery team.`;
const buildJuliaEscalationHint = (projectName: string) => `If ${projectName} is affecting production, access, billing, or approval flow, escalating is usually the fastest next step.`;
const DEFAULT_WIDGET_ALLOWED_DOMAINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

type SeedUser = Awaited<ReturnType<PrismaClient['user']['create']>>;
type SeedProject = Awaited<ReturnType<PrismaClient['project']['create']>>;
type SeedTicket = Awaited<ReturnType<PrismaClient['ticket']['create']>>;
type SeedAmc = Awaited<ReturnType<PrismaClient['amc']['create']>>;
type SeedHardwareAsset = Awaited<ReturnType<PrismaClient['hardwareAsset']['create']>>;
type SeedSupportTopic = Awaited<ReturnType<PrismaClient['supportTopic']['create']>>;

export async function seedSmallMode(prisma: PrismaClient) {
  await cleanSeedState(prisma);

  const random = createSeededRandom(20260320);
  const passwordHash = await bcrypt.hash(password, 10);

  const pm = await prisma.user.create({
    data: {
      name: 'Priya Manager',
      email: 'pm@atc.com',
      passwordHash,
      role: Role.PM,
      scopeMode: ScopeMode.GLOBAL,
      assignmentAuthority: AssignmentAuthority.SELF_AND_OTHERS,
      status: UserStatus.ACTIVE,
    },
  });

  const queueCoordinators = await Promise.all(
    [
      ['Sanjay Support', 'se@atc.com'],
      ['Mira Support', 'se1b@atc.com'],
    ].map(([name, email]) =>
      prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: Role.SE,
          supportLevel: SupportLevel.SE1,
          scopeMode: ScopeMode.GLOBAL,
          assignmentAuthority: AssignmentAuthority.SELF_AND_OTHERS,
          status: UserStatus.ACTIVE,
        },
      }),
    ),
  );

  const specialistEngineers = await Promise.all(
    [
      ['Dev Support', 'se2@atc.com'],
      ['Ira Support', 'se2b@atc.com'],
    ].map(([name, email]) =>
      prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: Role.SE,
          supportLevel: SupportLevel.SE2,
          scopeMode: ScopeMode.GLOBAL,
          assignmentAuthority: AssignmentAuthority.SELF_ONLY,
          status: UserStatus.ACTIVE,
        },
      }),
    ),
  );

  const projectSpecialists = await Promise.all(
    [
      ['Aisha Specialist', 'se3@atc.com'],
      ['Rahul Specialist', 'se3b@atc.com'],
      ['Neha Specialist', 'se3c@atc.com'],
      ['Varun Specialist', 'se3d@atc.com'],
    ].map(([name, email]) =>
      prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: Role.SE,
          supportLevel: SupportLevel.SE3,
          scopeMode: ScopeMode.PROJECT_SCOPED,
          assignmentAuthority: AssignmentAuthority.SELF_ONLY,
          status: UserStatus.ACTIVE,
        },
      }),
    ),
  );

  const workingEngineers = [...queueCoordinators, ...specialistEngineers];
  const allSupportUsers = [...workingEngineers, ...projectSpecialists];
  const allUsers = [pm, ...allSupportUsers];
  const createdClients = [];
  const createdProjects: SeedProject[] = [];

  for (const [clientIndex, blueprint] of CLIENT_BLUEPRINTS.entries()) {
    const client = await prisma.client.create({
      data: {
        name: blueprint.name,
        industry: blueprint.industry,
        address: blueprint.address,
        city: blueprint.city,
        phone: blueprint.phone,
        email: blueprint.email,
        website: blueprint.website,
        notes: blueprint.notes,
        status: clientIndex === CLIENT_BLUEPRINTS.length - 1 ? ClientStatus.INACTIVE : ClientStatus.ACTIVE,
        createdAt: daysAgo(70 - clientIndex * 4),
        contacts: {
          create: [
            {
              ...blueprint.primaryContact,
              isPrimary: true,
            },
            {
              name: `${blueprint.primaryContact.name.split(' ')[0]} Backup`,
              email: blueprint.primaryContact.email.replace('@', '+backup@'),
              phone: blueprint.primaryContact.phone.slice(0, 8) + '90',
              designation: 'Backup Contact',
              isPrimary: false,
            },
          ],
        },
        ...(blueprint.consignee
          ? {
              consignees: {
                create: [
                  {
                    name: blueprint.consignee.name,
                    address: blueprint.consignee.address,
                    contacts: {
                      create: [
                        {
                          ...blueprint.consignee.contact,
                        },
                      ],
                    },
                  },
                ],
              },
            }
          : {}),
      },
    });

    createdClients.push(client);

    for (const projectBlueprint of blueprint.projects) {
      const absoluteIndex = createdProjects.length;
      const projectSpecialist = absoluteIndex === 0 ? projectSpecialists[0] : projectSpecialists[absoluteIndex % projectSpecialists.length];
      const widgetKey = projectBlueprint.widgetKey ?? `widget_${slugify(`${blueprint.name}_${projectBlueprint.name}`)}`;
      const isInactive = absoluteIndex === 9 || absoluteIndex === 17 || absoluteIndex === 19;
      const widgetEnabled = !(absoluteIndex === 5 || absoluteIndex === 12 || absoluteIndex === 18);
      const project = await prisma.project.create({
        data: {
          clientId: client.id,
          assignedToId: projectSpecialist.id,
          name: projectBlueprint.name,
          description: projectBlueprint.description,
          widgetKey,
          widgetEnabled,
          widgetAllowedDomains: DEFAULT_WIDGET_ALLOWED_DOMAINS,
          juliaGreeting: buildJuliaGreeting(projectBlueprint.name),
          juliaFallbackMessage: buildJuliaFallback(projectBlueprint.name),
          juliaEscalationHint: buildJuliaEscalationHint(projectBlueprint.name),
          status: isInactive ? ProjectStatus.INACTIVE : ProjectStatus.ACTIVE,
          createdAt: daysAgo(60 - absoluteIndex * 2),
          memberships: {
            create: [{ userId: projectSpecialist.id }],
          },
        },
      });

      createdProjects.push(project);

      const faqCount = absoluteIndex < 10 ? 2 : 1;
      for (let faqIndex = 0; faqIndex < faqCount; faqIndex += 1) {
        await prisma.faq.create({
          data: {
            projectId: project.id,
            question: faqIndex === 0 ? `How do I get started with ${project.name}?` : `What should I try first if ${project.name} looks stuck?`,
            answer:
              faqIndex === 0
                ? `Start by checking access, project-specific setup, and the latest known issues for ${project.name}.`
                : `Refresh the page, retry the last action, and collect screenshots or logs before escalating ${project.name}.`,
            sortOrder: faqIndex + 1,
            createdAt: daysAgo(30 - absoluteIndex),
          },
        });
      }

      if (absoluteIndex < 18) {
        await prisma.projectDoc.create({
          data: {
            projectId: project.id,
            title: `${project.name} operating notes`,
            content: `${project.name} supports ${blueprint.industry.toLowerCase()} workflows. Common tickets involve access, data mismatch, workflow stalls, and post-release validation. Start with browser/session checks, verify background jobs, confirm role permissions, and escalate client-impacting issues quickly.`,
            status: absoluteIndex % 5 === 4 ? KnowledgeStatus.DRAFT : KnowledgeStatus.PUBLISHED,
            publishedAt: absoluteIndex % 5 === 4 ? null : daysAgo(25 - absoluteIndex),
            createdById: projectSpecialist.id,
            createdAt: daysAgo(28 - absoluteIndex),
          },
        });
      }
    }
  }

  const createdRunbooks = [];
  for (const [index, [title, category]] of RUNBOOK_BLUEPRINTS.entries()) {
    const author = index % 3 === 0 ? workingEngineers[index % workingEngineers.length] : projectSpecialists[index % projectSpecialists.length];
    createdRunbooks.push(
      await prisma.runbook.create({
        data: {
          title,
          category,
          content: `${title}. Verify the issue scope, confirm role and project context, apply the recommended corrective step, and record whether the result was temporary or final.`,
          status: index >= 9 ? KnowledgeStatus.DRAFT : KnowledgeStatus.PUBLISHED,
          publishedAt: index >= 9 ? null : daysAgo(20 - index),
          createdById: author.id,
          createdAt: daysAgo(22 - index),
        },
      }),
    );
  }

  const activeProjects = createdProjects.filter((project) => project.status === ProjectStatus.ACTIVE);
  const createdAmcs: SeedAmc[] = [];

  for (let index = 0; index < 15; index += 1) {
    const project = createdProjects[index];
    const client = createdClients.find((entry) => entry.id === project.clientId)!;
    const hoursIncluded = 24 + (index % 4) * 8;
    const status = index < 10 ? AmcStatus.ACTIVE : index < 13 ? AmcStatus.EXPIRED : AmcStatus.CANCELLED;
    const hoursUsed = status === AmcStatus.ACTIVE ? Math.min(hoursIncluded, 8 + index * 2) : hoursIncluded + intBetween(1, 6, random);
    createdAmcs.push(
      await prisma.amc.create({
        data: {
          clientId: client.id,
          projectId: project.id,
          hoursIncluded,
          hoursUsed,
          startDate: daysAgo(120 - index * 3),
          endDate: daysAgo(status === AmcStatus.ACTIVE ? -120 + index * 2 : 5 + index),
          status,
        },
      }),
    );
  }

  const createdHardwareAssets: SeedHardwareAsset[] = [];
  for (let index = 0; index < 14; index += 1) {
    const project = activeProjects[index % activeProjects.length];
    const blueprint = HARDWARE_BLUEPRINTS[index % HARDWARE_BLUEPRINTS.length];
    const linkedAmc = createdAmcs.find((amc) => amc.projectId === project.id && amc.status === AmcStatus.ACTIVE) ?? null;

    createdHardwareAssets.push(
      await prisma.hardwareAsset.create({
        data: {
          clientId: project.clientId,
          projectId: project.id,
          amcId: linkedAmc?.id ?? null,
          category: blueprint.category,
          brand: blueprint.brand,
          model: blueprint.model,
          serialNumber: `ATC-${String(index + 1).padStart(5, '0')}`,
          location: `${createdClients.find((client) => client.id === project.clientId)?.city ?? 'Nagpur'} support site`,
          status: index % 11 === 0 ? HardwareAssetStatus.INACTIVE : HardwareAssetStatus.ACTIVE,
          vendorSupportUrl: blueprint.vendorSupportUrl,
          notes: `${blueprint.notes} Common V2 seed issue: ${blueprint.issue}.`,
          createdAt: daysAgo(45 - index),
        },
      }),
    );
  }

  for (let index = 0; index < 4; index += 1) {
    const client = createdClients[(index + 2) % createdClients.length];
    const blueprint = HARDWARE_BLUEPRINTS[(index + 1) % HARDWARE_BLUEPRINTS.length];

    createdHardwareAssets.push(
      await prisma.hardwareAsset.create({
        data: {
          clientId: client.id,
          category: blueprint.category,
          brand: blueprint.brand,
          model: blueprint.model,
          serialNumber: `ATC-HWONLY-${String(index + 1).padStart(3, '0')}`,
          location: `${client.city} hardware-only desk`,
          status: HardwareAssetStatus.ACTIVE,
          vendorSupportUrl: blueprint.vendorSupportUrl,
          notes: `Client-owned hardware asset without project dependency. ${blueprint.notes}`,
          createdAt: daysAgo(32 - index),
        },
      }),
    );
  }

  const createdSupportTopics: SeedSupportTopic[] = [];
  for (const [index, playbook] of HARDWARE_PLAYBOOKS.entries()) {
    createdSupportTopics.push(
      await prisma.supportTopic.create({
        data: {
          scope: SupportTopicScope.HARDWARE_CATEGORY,
          kind: SupportTopicKind.PLAYBOOK,
          supportType: SupportType.HARDWARE,
          hardwareCategory: playbook.category,
          status: KnowledgeStatus.PUBLISHED,
          title: playbook.title,
          summary: playbook.summary,
          content: playbook.content,
          sortOrder: index + 1,
          createdAt: daysAgo(24 - index),
        },
      }),
    );
  }

  for (const [index, blueprint] of HARDWARE_BLUEPRINTS.entries()) {
    createdSupportTopics.push(
      await prisma.supportTopic.create({
        data: {
          scope: SupportTopicScope.HARDWARE_CATEGORY,
          kind: SupportTopicKind.VENDOR_LINK,
          supportType: SupportType.HARDWARE,
          hardwareCategory: blueprint.category,
          status: KnowledgeStatus.PUBLISHED,
          title: `${blueprint.brand} ${blueprint.model} vendor support`,
          summary: `Official vendor reference for ${blueprint.brand} ${blueprint.model} after safe universal diagnostics.`,
          content: `Use this vendor reference only after universal diagnostics are complete or a model-specific error code appears. Device: ${blueprint.brand} ${blueprint.model}.`,
          vendorUrl: blueprint.vendorSupportUrl,
          sortOrder: 20 + index,
          createdAt: daysAgo(21 - index),
        },
      }),
    );
  }

  for (let index = 0; index < 12; index += 1) {
    const project = activeProjects[index % activeProjects.length];
    const template = SOFTWARE_TOPIC_TEMPLATES[index % SOFTWARE_TOPIC_TEMPLATES.length];

    createdSupportTopics.push(
      await prisma.supportTopic.create({
        data: {
          scope: SupportTopicScope.PROJECT,
          kind: SupportTopicKind.SOP,
          supportType: SupportType.SOFTWARE,
          clientId: project.clientId,
          projectId: project.id,
          status: index % 6 === 5 ? KnowledgeStatus.DRAFT : KnowledgeStatus.PUBLISHED,
          title: `${project.name}: ${template.title}`,
          summary: template.summary,
          content: `${template.content} Project context: ${project.name}.`,
          sortOrder: index + 1,
          createdAt: daysAgo(18 - index),
        },
      }),
    );
  }

  const createdChats = [];
  for (let index = 0; index < 30; index += 1) {
    const project = activeProjects[index % activeProjects.length];
    const status = index < 12 ? ChatSessionStatus.ESCALATED : index < 22 ? ChatSessionStatus.ACTIVE : ChatSessionStatus.ENDED;
    const createdAt = daysAgo(18 - Math.floor(index / 2), 8 + (index % 5));
    const runbook = createdRunbooks[index % createdRunbooks.length];
    const projectDoc = await prisma.projectDoc.findFirst({
      where: {
        projectId: project.id,
        status: KnowledgeStatus.PUBLISHED,
      },
      orderBy: {
        id: 'asc',
      },
    });

    const chat = await prisma.chatSession.create({
      data: {
        projectId: project.id,
        clientName: `Contact ${index + 1}`,
        clientEmail: `contact${index + 1}@${slugify(project.name)}.example.com`,
        status,
        createdAt,
        endedAt: status === ChatSessionStatus.ACTIVE ? null : hoursAfter(createdAt, 1),
        messages: {
          create: [
            {
              role: ChatRole.USER,
              content: pick(ISSUE_TITLES as unknown as string[], random),
              createdAt,
            },
            {
              role: ChatRole.JULIA,
              content: `I found guidance in the ${project.name} knowledge set. Please try the first recommended troubleshooting step before escalating.`,
              sourceRefs: {
                runbookIds: [runbook.id],
                projectDocIds: projectDoc ? [projectDoc.id] : [],
              },
              createdAt: hoursAfter(createdAt, 0.1),
            },
            {
              role: ChatRole.USER,
              content: status === ChatSessionStatus.ESCALATED ? 'I still need human help on this issue.' : 'Thanks, that gives me enough to continue.',
              createdAt: hoursAfter(createdAt, 0.2),
            },
          ],
        },
      },
      include: {
        messages: true,
      },
    });

    createdChats.push(chat);
  }

  const statusPlan: TicketStatus[] = [
    ...Array(24).fill(TicketStatus.NEW),
    ...Array(18).fill(TicketStatus.ASSIGNED),
    ...Array(24).fill(TicketStatus.IN_PROGRESS),
    ...Array(12).fill(TicketStatus.WAITING_ON_CUSTOMER),
    ...Array(12).fill(TicketStatus.ESCALATED),
    ...Array(24).fill(TicketStatus.RESOLVED),
    ...Array(6).fill(TicketStatus.REOPENED),
  ];

  const createdTickets: SeedTicket[] = [];
  const emailEligibleTickets: SeedTicket[] = [];
  const supportSessionStatuses = [
    SupportSessionStatus.ACTIVE,
    SupportSessionStatus.ENDED,
    SupportSessionStatus.ESCALATED,
    SupportSessionStatus.ACTIVE,
    SupportSessionStatus.ENDED,
    SupportSessionStatus.ESCALATED,
    SupportSessionStatus.ENDED,
    SupportSessionStatus.ACTIVE,
    SupportSessionStatus.ESCALATED,
    SupportSessionStatus.ENDED,
    SupportSessionStatus.ACTIVE,
    SupportSessionStatus.ENDED,
  ];

  for (const [index, status] of supportSessionStatuses.entries()) {
    const isHardware = index % 3 !== 1;
    const hardwareAsset = isHardware ? createdHardwareAssets[index % createdHardwareAssets.length] : null;
    const project = isHardware
      ? hardwareAsset?.projectId
        ? activeProjects.find((entry) => entry.id === hardwareAsset.projectId) ?? null
        : null
      : activeProjects[index % activeProjects.length];
    const client = project ? createdClients.find((entry) => entry.id === project.clientId)! : createdClients.find((entry) => entry.id === hardwareAsset?.clientId)!;
    const supportType = isHardware ? SupportType.HARDWARE : SupportType.SOFTWARE;
    const source = project ? SupportSessionSource.PROJECT_WIDGET : SupportSessionSource.GENERAL_WIDGET;
    const selectedTopic =
      isHardware && hardwareAsset
        ? createdSupportTopics.find(
            (topic) =>
              topic.supportType === SupportType.HARDWARE &&
              topic.kind === SupportTopicKind.PLAYBOOK &&
              topic.hardwareCategory === hardwareAsset.category,
          )
        : createdSupportTopics.find((topic) => topic.supportType === SupportType.SOFTWARE && topic.projectId === project?.id);
    const createdAt = daysAgo(12 - index, 9 + (index % 6));
    const issueSummary = isHardware
      ? `${hardwareAsset?.brand ?? 'Hardware'} ${hardwareAsset?.model ?? 'device'} needs frontline diagnostics`
      : `${project?.name ?? 'Software project'} user needs guided SOP support`;
    const supportSummary =
      status === SupportSessionStatus.ACTIVE
        ? 'Session is active and still collecting troubleshooting context.'
        : status === SupportSessionStatus.ENDED
          ? 'Julia guided the user through safe self-service steps and the session ended without human ticket creation.'
          : 'Julia completed safe steps, detected human follow-up is needed, and escalated with attempted actions.';
    const confidenceScore = status === SupportSessionStatus.ESCALATED ? 0.42 + index * 0.01 : 0.76 - index * 0.01;

    const supportSession = await prisma.supportSession.create({
      data: {
        source,
        status,
        supportType,
        clientId: client.id,
        projectId: project?.id ?? null,
        hardwareAssetId: hardwareAsset?.id ?? null,
        selectedTopicId: selectedTopic?.id ?? null,
        requesterName: `${client.name.split(' ')[0]} Operator ${index + 1}`,
        requesterEmail: `operator${index + 1}@${slugify(client.name)}.example.com`,
        requesterPhone: `90000${String(index + 1).padStart(5, '0')}`,
        issueSummary,
        supportSummary,
        confidenceScore,
        createdAt,
        endedAt: status === SupportSessionStatus.ENDED ? hoursAfter(createdAt, 1) : null,
        escalatedAt: status === SupportSessionStatus.ESCALATED ? hoursAfter(createdAt, 1.25) : null,
        messages: {
          create: [
            {
              role: SupportSessionMessageRole.SYSTEM,
              content: `Support session started for ${client.name}${project ? ` / ${project.name}` : ''}.`,
              createdAt,
            },
            {
              role: SupportSessionMessageRole.USER,
              content: isHardware
                ? `The ${hardwareAsset?.brand ?? 'device'} ${hardwareAsset?.model ?? ''} is not working correctly.`
                : `I need help with ${project?.name ?? 'the application'} and cannot complete my work.`,
              createdAt: hoursAfter(createdAt, 0.08),
            },
            {
              role: SupportSessionMessageRole.JULIA,
              content: isHardware
                ? 'Let us run safe first-line checks: power, connection, device status, and any visible error indicators. I will stop before risky model-specific steps.'
                : 'I found a project SOP. Let us collect the screen, action, expected result, and actual result before deciding whether this needs human support.',
              sourceRefs: selectedTopic ? { supportTopicIds: [selectedTopic.id] } : undefined,
              createdAt: hoursAfter(createdAt, 0.14),
            },
            {
              role: SupportSessionMessageRole.USER,
              content:
                status === SupportSessionStatus.ESCALATED
                  ? 'The basic checks did not resolve this. Please create a support ticket.'
                  : status === SupportSessionStatus.ENDED
                    ? 'This helped. I can continue now.'
                    : 'I am checking this step now.',
              createdAt: hoursAfter(createdAt, 0.3),
            },
          ],
        },
      },
    });

    if (status === SupportSessionStatus.ESCALATED) {
      createdTickets.push(
        await prisma.ticket.create({
          data: {
            supportSessionId: supportSession.id,
            clientId: client.id,
            projectId: project?.id ?? null,
            hardwareAssetId: hardwareAsset?.id ?? null,
            requesterName: supportSession.requesterName,
            requesterEmail: supportSession.requesterEmail,
            title: `${client.name}: ${issueSummary}`,
            description: `Escalated from V2 support session. ${supportSummary}`,
            source: source === SupportSessionSource.PROJECT_WIDGET ? TicketSource.PROJECT_WIDGET : TicketSource.GENERAL_WIDGET,
            supportType,
            priority: isHardware ? TicketPriority.HIGH : TicketPriority.MEDIUM,
            status: TicketStatus.NEW,
            supportSummary,
            confidenceScore,
            createdAt: hoursAfter(createdAt, 1.3),
          },
        }),
      );
    }
  }

  const escalatedChats = createdChats.filter((chat) => chat.status === ChatSessionStatus.ESCALATED);

  for (const [index, status] of statusPlan.entries()) {
    const project = activeProjects[index % activeProjects.length];
    const projectSpecialist = projectSpecialists.find((specialist) => specialist.id === project.assignedToId)!;
    const chatSession = index < escalatedChats.length ? escalatedChats[index] : null;
    const createdAt = daysAgo(16 - (index % 12), 7 + (index % 8));
    const priority = pickWeighted(
      [
        { value: TicketPriority.LOW, weight: 1 },
        { value: TicketPriority.MEDIUM, weight: 4 },
        { value: TicketPriority.HIGH, weight: 3 },
        { value: TicketPriority.CRITICAL, weight: 1 },
      ],
      random,
    );
    const assignedEngineer = workingEngineers[index % workingEngineers.length];
    const assignedToId =
      status === TicketStatus.NEW ? null : status === TicketStatus.ESCALATED ? projectSpecialist.id : assignedEngineer.id;
    const requesterName = chatSession?.clientName ?? `Requester ${index + 1}`;
    const requesterEmail = chatSession?.clientEmail ?? `requester${index + 1}@${slugify(project.name)}.example.com`;
    const resolutionSummary =
      status === TicketStatus.RESOLVED ? 'Validated the fix, confirmed normal workflow behavior, and closed the ticket.' : null;

    const ticket = await prisma.ticket.create({
      data: {
        projectId: project.id,
        clientId: project.clientId,
        chatSessionId: chatSession?.id ?? null,
        requesterName,
        requesterEmail,
        emailThreadToken: index < 40 ? `seedthread${String(index + 1).padStart(4, '0')}` : null,
        title: `${project.name}: ${ISSUE_TITLES[index % ISSUE_TITLES.length]}`,
        description: `Seeded issue for ${project.name}. This ticket helps exercise queue filters, detail tabs, notifications, and role-based handling.`,
        source: TicketSource.PROJECT_WIDGET,
        supportType: SupportType.SOFTWARE,
        priority,
        status,
        assignedToId,
        resolutionSummary,
        createdAt,
        resolvedAt: status === TicketStatus.RESOLVED ? hoursAfter(createdAt, 8 + (index % 12)) : null,
      },
    });

    createdTickets.push(ticket);

    if (ticket.emailThreadToken) {
      emailEligibleTickets.push(ticket);
    }

    if (status === TicketStatus.ESCALATED) {
      await prisma.escalationHistory.create({
        data: {
          ticketId: ticket.id,
          createdById: assignedEngineer.id,
          fromStatus: TicketStatus.IN_PROGRESS,
          toStatus: TicketStatus.ESCALATED,
          fromAssigneeId: assignedEngineer.id,
          toAssigneeId: projectSpecialist.id,
          note: 'Escalated for project specialist review after initial troubleshooting did not resolve the issue.',
          createdAt: hoursAfter(createdAt, 4),
        },
      });
    }
  }

  const targetMessageCount = 500;
  const ticketMessagePlans = new Map<
    number,
    Array<{ type: MessageType; userId: number | null; senderName?: string | null; senderEmail?: string | null; content: string; createdAt: Date }>
  >();

  for (const ticket of createdTickets) {
    const entries = [
      {
        type: MessageType.SYSTEM,
        userId: null,
        content: ticket.chatSessionId ? 'Ticket created from widget escalation.' : 'Ticket created from seeded widget intake.',
        createdAt: ticket.createdAt,
      },
    ];

    const baseExtraCount =
      ticket.status === TicketStatus.NEW
        ? 0
        : ticket.status === TicketStatus.ASSIGNED
          ? 2
          : ticket.status === TicketStatus.IN_PROGRESS
            ? 4
            : ticket.status === TicketStatus.WAITING_ON_CUSTOMER
              ? 4
              : ticket.status === TicketStatus.ESCALATED
                ? 5
                : ticket.status === TicketStatus.RESOLVED
                  ? 4
                  : 5;

    for (let index = 0; index < baseExtraCount; index += 1) {
      const createdAt = hoursAfter(ticket.createdAt, index + 1);
      if (index === baseExtraCount - 1 && (ticket.status === TicketStatus.WAITING_ON_CUSTOMER || ticket.status === TicketStatus.REOPENED)) {
        entries.push({
          type: MessageType.REPLY,
          userId: null,
          senderName: ticket.requesterName,
          senderEmail: ticket.requesterEmail,
          content: pick(CUSTOMER_REPLY_TEMPLATES as unknown as string[], random),
          createdAt,
        });
      } else if (index % 3 === 2) {
        entries.push({
          type: MessageType.INTERNAL_NOTE,
          userId: ticket.assignedToId ?? workingEngineers[0].id,
          content: pick(INTERNAL_NOTE_TEMPLATES as unknown as string[], random),
          createdAt,
        });
      } else {
        entries.push({
          type: MessageType.REPLY,
          userId: ticket.assignedToId ?? workingEngineers[0].id,
          content: pick(AGENT_REPLY_TEMPLATES as unknown as string[], random),
          createdAt,
        });
      }
    }

    ticketMessagePlans.set(ticket.id, entries);
  }

  const currentMessageCount = Array.from(ticketMessagePlans.values()).reduce((sum, entries) => sum + entries.length, 0);
  const extraMessagesNeeded = targetMessageCount - currentMessageCount;

  for (let index = 0; index < extraMessagesNeeded; index += 1) {
    const ticket = createdTickets[index % createdTickets.length];
    const plan = ticketMessagePlans.get(ticket.id)!;
    plan.push({
      type: MessageType.REPLY,
      userId: ticket.assignedToId ?? workingEngineers[0].id,
      content: pick(AGENT_REPLY_TEMPLATES as unknown as string[], random),
      createdAt: hoursAfter(ticket.createdAt, plan.length + 1),
    });
  }

  const createdReplyMessages: Array<{
    id: number;
    ticketId: number;
    userId: number | null;
    senderName: string | null;
    senderEmail: string | null;
    createdAt: Date;
  }> = [];

  for (const ticket of createdTickets) {
    const plan = ticketMessagePlans.get(ticket.id)!;
    for (const entry of plan) {
      const message = await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          userId: entry.userId,
          senderName: entry.senderName ?? null,
          senderEmail: entry.senderEmail ?? null,
          type: entry.type,
          content: entry.content,
          createdAt: entry.createdAt,
        },
      });

      if (entry.type === MessageType.REPLY) {
        createdReplyMessages.push({
          id: message.id,
          ticketId: ticket.id,
          userId: entry.userId,
          senderName: entry.senderName ?? null,
          senderEmail: entry.senderEmail ?? null,
          createdAt: entry.createdAt,
        });
      }
    }
  }

  const createdAttachmentNames: string[] = [];
  for (let index = 0; index < 30; index += 1) {
    const replyMessage = createdReplyMessages[(index * 7) % createdReplyMessages.length];
    const ticket = createdTickets.find((entry) => entry.id === replyMessage.ticketId)!;
    const [originalName, mimeType] = ATTACHMENT_BLUEPRINTS[index % ATTACHMENT_BLUEPRINTS.length];
    const storedName = `seed-attachment-${String(index + 1).padStart(3, '0')}-${slugify(originalName)}`;
    createdAttachmentNames.push(storedName);
    await writeSeedAttachment(storedName, `Seed attachment for ticket ${ticket.id}: ${ticket.title}\nCaptured at ${replyMessage.createdAt.toISOString()}`);
    await prisma.ticketAttachment.create({
      data: {
        ticketId: ticket.id,
        ticketMessageId: replyMessage.id,
        uploadedById: replyMessage.userId ?? workingEngineers[0].id,
        originalName,
        storedName,
        mimeType,
        sizeBytes: 240 + index * 17,
        createdAt: replyMessage.createdAt,
      },
    });
  }

  await clearOrphanedAttachmentFiles(createdAttachmentNames);

  for (let index = 0; index < 30; index += 1) {
    const ticket = emailEligibleTickets[index % emailEligibleTickets.length];
    const outboundReply = createdReplyMessages.find((message) => message.ticketId === ticket.id && message.userId);
    await prisma.ticketEmail.create({
      data: {
        ticketId: ticket.id,
        ticketMessageId: outboundReply?.id ?? null,
        createdById: outboundReply?.userId ?? ticket.assignedToId,
        direction: TicketEmailDirection.OUTBOUND,
        status: chance(0.15, random) ? TicketEmailStatus.LOGGED : TicketEmailStatus.SENT,
        subject: `Update on ${ticket.title} [ATC:${ticket.emailThreadToken}]`,
        bodyText: 'This is a seeded outbound update showing how email activity appears on the ticket.',
        fromName: 'ATC Support',
        fromEmail: 'support@localhost',
        toName: ticket.requesterName,
        toEmail: ticket.requesterEmail || `requester${ticket.id}@seed.example.com`,
        providerMessageId: `seed-msg-${ticket.id}-out-${index + 1}`,
        deliveredAt: hoursAfter(ticket.createdAt, 2 + index),
        createdAt: hoursAfter(ticket.createdAt, 2 + index),
      },
    });
  }

  for (let index = 0; index < 20; index += 1) {
    const ticket = emailEligibleTickets[(index * 2) % emailEligibleTickets.length];
    const customerReply = createdReplyMessages.find((message) => message.ticketId === ticket.id && !message.userId);
    await prisma.ticketEmail.create({
      data: {
        ticketId: ticket.id,
        ticketMessageId: customerReply?.id ?? null,
        createdById: null,
        direction: TicketEmailDirection.INBOUND,
        status: TicketEmailStatus.RECEIVED,
        subject: `Re: ${ticket.title} [ATC:${ticket.emailThreadToken}]`,
        bodyText: customerReply?.senderName ? `${customerReply.senderName} sent a seeded reply by email.` : 'Seeded customer follow-up reply.',
        fromName: ticket.requesterName,
        fromEmail: ticket.requesterEmail || `requester${ticket.id}@seed.example.com`,
        toName: 'ATC Support',
        toEmail: 'support@localhost',
        deliveredAt: hoursAfter(ticket.createdAt, 5 + index),
        createdAt: hoursAfter(ticket.createdAt, 5 + index),
      },
    });
  }

  const notificationUsers = [...allUsers];
  for (let index = 0; index < 80; index += 1) {
    const ticket = createdTickets[index % createdTickets.length];
    const user = notificationUsers[index % notificationUsers.length];
    const type = pick(
      [
        NotificationType.TICKET_CREATED,
        NotificationType.TICKET_ASSIGNED,
        NotificationType.TICKET_ESCALATED,
        NotificationType.TICKET_RESOLVED,
        NotificationType.TICKET_REOPENED,
        NotificationType.TICKET_CUSTOMER_REPLIED,
      ],
      random,
    );
    const createdAt = daysAgo(10 - (index % 9), 9 + (index % 6));
    const isRead = index % 4 === 0;
    await prisma.notification.create({
      data: {
        userId: user.id,
        type,
        title: `${type.replaceAll('_', ' ')}: ${ticket.title}`,
        body: `Seeded notification for ${ticket.title} to exercise inbox states and navigation.`,
        link: `/agent/tickets/${ticket.id}/summary`,
        isRead,
        createdAt,
        readAt: isRead ? hoursAfter(createdAt, 3) : null,
      },
    });
  }

  console.log('Seed completed successfully.');
  console.log('Mode: small');
  console.log('Lower-end small-scale seed generated:');
  console.log('- 1 PM, 2 SE1, 2 SE2, 4 SE3');
  console.log('- 8 clients, 20 projects, 15 AMCs');
  console.log(`- ${createdHardwareAssets.length} hardware assets, ${createdSupportTopics.length} support topics, ${supportSessionStatuses.length} support sessions`);
  console.log(`- 30 chats, ${createdTickets.length} tickets, 500+ ticket messages`);
  console.log('- 30 FAQs, 12 runbooks, 18 project docs');
  console.log('- 30 attachments, 50 email events, 80 notifications');
  console.log('Login credentials:');
  console.log(`PM: ${pm.email} / ${password}`);
  console.log(`SE1: ${queueCoordinators[0].email} / ${password}`);
  console.log(`SE3: ${projectSpecialists[0].email} / ${password}`);
}
