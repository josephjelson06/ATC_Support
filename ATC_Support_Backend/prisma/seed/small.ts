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
  SupportLevel,
  SupportSessionMessageRole,
  SupportSessionSource,
  SupportSessionStatus,
  SupportTopicKind,
  SupportTopicScope,
  SupportType,
  TicketEmailDirection,
  TicketEmailStatus,
  TicketPriority,
  TicketSource,
  TicketStatus,
  UserStatus,
  type PrismaClient,
} from '@prisma/client';

import { cleanSeedState, clearOrphanedAttachmentFiles, daysAgo, hoursAfter, password, writeSeedAttachment } from './utils';

const DOMAINS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'];
const greeting = (name: string) => `Hi, I am Julia for ${name}. Tell me what is blocking your work and I will search the approved support knowledge first.`;
const fallback = (name: string) => `I do not have enough ${name} context to answer confidently. I can help escalate this to the ATC support team.`;
const hint = (name: string) => `If ${name} is affecting production, access, or approvals, escalating is usually the fastest next step.`;

export async function seedSmallMode(prisma: PrismaClient) {
  await cleanSeedState(prisma);
  const passwordHash = await bcrypt.hash(password, 10);

  const [pm, se, se3] = await Promise.all([
    prisma.user.create({ data: { name: 'Priya Manager', email: 'pm@atc.com', passwordHash, role: Role.PM, scopeMode: ScopeMode.GLOBAL, assignmentAuthority: AssignmentAuthority.SELF_AND_OTHERS, status: UserStatus.ACTIVE, createdAt: daysAgo(30) } }),
    prisma.user.create({ data: { name: 'Sanjay Support', email: 'se@atc.com', passwordHash, role: Role.SE, supportLevel: SupportLevel.SE1, scopeMode: ScopeMode.GLOBAL, assignmentAuthority: AssignmentAuthority.SELF_AND_OTHERS, status: UserStatus.ACTIVE, createdAt: daysAgo(28) } }),
    prisma.user.create({ data: { name: 'Aisha Specialist', email: 'se3@atc.com', passwordHash, role: Role.SE, supportLevel: SupportLevel.SE3, scopeMode: ScopeMode.PROJECT_SCOPED, assignmentAuthority: AssignmentAuthority.SELF_ONLY, status: UserStatus.ACTIVE, createdAt: daysAgo(26) } }),
  ]);

  const [acme, caltech, bharat] = await Promise.all([
    prisma.client.create({ data: { name: 'Acme Logistics', industry: 'Logistics', city: 'Bangalore', address: '12 Logistics Park Road', phone: '080-5550-1000', email: 'support@acme-logistics.com', website: 'https://acme-logistics.example.com', notes: 'Warehouse and CRM support client.', status: ClientStatus.ACTIVE, createdAt: daysAgo(24), contacts: { create: [{ name: 'Arun Shah', email: 'arun@acme-logistics.com', phone: '9876543210', designation: 'IT Manager', isPrimary: true }] }, consignees: { create: [{ name: 'Acme North Hub', address: 'Bangalore, Karnataka', contacts: { create: [{ name: 'Meera Singh', email: 'meera@acme-logistics.com', phone: '9988776655', designation: 'Operations Lead' }] } }] } } }),
    prisma.client.create({ data: { name: 'CalTech Industries', industry: 'Manufacturing', city: 'Nagpur', address: '4 Plant Systems Road', phone: '0712-440-2211', email: 'ops@caltech-industries.com', website: 'https://caltech-industries.example.com', notes: 'Demo project client using the real widget key.', status: ClientStatus.ACTIVE, createdAt: daysAgo(20), contacts: { create: [{ name: 'Rohan Kale', email: 'rohan@caltech-industries.com', phone: '9000011111', designation: 'Digital Operations Lead', isPrimary: true }] } } }),
    prisma.client.create({ data: { name: 'Bharat Packaging', industry: 'Packaging', city: 'Pune', address: '88 Packaging Estate', phone: '020-5500-9911', email: 'service@bharat-packaging.com', website: 'https://bharat-packaging.example.com', notes: 'Hardware-only support client.', status: ClientStatus.ACTIVE, createdAt: daysAgo(16), contacts: { create: [{ name: 'Kiran More', email: 'kiran@bharat-packaging.com', phone: '9888123456', designation: 'Plant Coordinator', isPrimary: true }] } } }),
  ]);

  const [warehousePortal, crmDashboard, caltechProject] = await Promise.all([
    prisma.project.create({ data: { clientId: acme.id, assignedToId: se3.id, name: 'Warehouse Portal', description: 'Warehouse operations support portal.', widgetKey: 'widget_warehouse_portal', widgetEnabled: true, widgetAllowedDomains: DOMAINS, juliaGreeting: greeting('Warehouse Portal'), juliaFallbackMessage: fallback('Warehouse Portal'), juliaEscalationHint: hint('Warehouse Portal'), status: ProjectStatus.ACTIVE, createdAt: daysAgo(18) } }),
    prisma.project.create({ data: { clientId: acme.id, assignedToId: se3.id, name: 'CRM Dashboard', description: 'Internal CRM support workspace.', widgetKey: 'widget_crm_dashboard', widgetEnabled: true, widgetAllowedDomains: DOMAINS, juliaGreeting: greeting('CRM Dashboard'), juliaFallbackMessage: fallback('CRM Dashboard'), juliaEscalationHint: hint('CRM Dashboard'), status: ProjectStatus.ACTIVE, createdAt: daysAgo(17) } }),
    prisma.project.create({ data: { clientId: caltech.id, assignedToId: se3.id, name: 'CalTech Project', description: 'Demo project for packaged widget testing.', widgetKey: 'IxxGHge7oNDHSekgTSYFyIeQ', widgetEnabled: true, widgetAllowedDomains: DOMAINS, juliaGreeting: greeting('CalTech Project'), juliaFallbackMessage: fallback('CalTech Project'), juliaEscalationHint: hint('CalTech Project'), status: ProjectStatus.ACTIVE, createdAt: daysAgo(15) } }),
  ]);

  await prisma.projectMember.createMany({ data: [{ userId: se3.id, projectId: warehousePortal.id }, { userId: se3.id, projectId: crmDashboard.id }, { userId: se3.id, projectId: caltechProject.id }, { userId: se.id, projectId: warehousePortal.id }, { userId: se.id, projectId: crmDashboard.id }] });

  const [warehouseAmc, crmAmc, bharatAmc] = await Promise.all([
    prisma.amc.create({ data: { clientId: acme.id, projectId: warehousePortal.id, hoursIncluded: 48, hoursUsed: 14, startDate: daysAgo(90), endDate: daysAgo(-275), status: AmcStatus.ACTIVE } }),
    prisma.amc.create({ data: { clientId: acme.id, projectId: crmDashboard.id, hoursIncluded: 36, hoursUsed: 10, startDate: daysAgo(80), endDate: daysAgo(-285), status: AmcStatus.ACTIVE } }),
    prisma.amc.create({ data: { clientId: bharat.id, hoursIncluded: 24, hoursUsed: 5, startDate: daysAgo(70), endDate: daysAgo(-295), status: AmcStatus.ACTIVE } }),
  ]);

  const [honeywell, zebra, cisco] = await Promise.all([
    prisma.hardwareBrand.create({ data: { category: HardwareCategory.PRINTER, name: 'Honeywell', vendorSupportUrl: 'https://sps-support.honeywell.com/s/' } }),
    prisma.hardwareBrand.create({ data: { category: HardwareCategory.SCANNER, name: 'Zebra', vendorSupportUrl: 'https://www.zebra.com/us/en/support-downloads.html' } }),
    prisma.hardwareBrand.create({ data: { category: HardwareCategory.NETWORK_DEVICE, name: 'Cisco', vendorSupportUrl: 'https://www.cisco.com/c/en/us/support/index.html' } }),
  ]);

  const [pc42t, pm43, ds2208, cbs250] = await Promise.all([
    prisma.hardwareModel.create({ data: { hardwareBrandId: honeywell.id, category: HardwareCategory.PRINTER, name: 'PC42t', notes: 'Warehouse label printer.', vendorSupportUrl: honeywell.vendorSupportUrl } }),
    prisma.hardwareModel.create({ data: { hardwareBrandId: honeywell.id, category: HardwareCategory.PRINTER, name: 'PM43', notes: 'Industrial packing-line printer.', vendorSupportUrl: honeywell.vendorSupportUrl } }),
    prisma.hardwareModel.create({ data: { hardwareBrandId: zebra.id, category: HardwareCategory.SCANNER, name: 'DS2208', notes: 'Desk-side barcode scanner.', vendorSupportUrl: zebra.vendorSupportUrl } }),
    prisma.hardwareModel.create({ data: { hardwareBrandId: cisco.id, category: HardwareCategory.NETWORK_DEVICE, name: 'CBS250', notes: 'Managed switch.', vendorSupportUrl: cisco.vendorSupportUrl } }),
  ]);

  const [acmePrinter, acmeScanner, caltechSwitch, bharatPrinter] = await Promise.all([
    prisma.hardwareAsset.create({ data: { clientId: acme.id, projectId: warehousePortal.id, amcId: warehouseAmc.id, hardwareModelId: pc42t.id, category: HardwareCategory.PRINTER, brand: 'Honeywell', model: 'PC42t', serialNumber: 'ACME-PC42-001', location: 'Warehouse Bay 1', status: HardwareAssetStatus.ACTIVE, notes: 'Primary dispatch label printer.', vendorSupportUrl: pc42t.vendorSupportUrl } }),
    prisma.hardwareAsset.create({ data: { clientId: acme.id, projectId: crmDashboard.id, amcId: crmAmc.id, hardwareModelId: ds2208.id, category: HardwareCategory.SCANNER, brand: 'Zebra', model: 'DS2208', serialNumber: 'ACME-DS22-014', location: 'CRM Front Desk', status: HardwareAssetStatus.ACTIVE, notes: 'Desk-side inbound scanner.', vendorSupportUrl: ds2208.vendorSupportUrl } }),
    prisma.hardwareAsset.create({ data: { clientId: caltech.id, projectId: caltechProject.id, hardwareModelId: cbs250.id, category: HardwareCategory.NETWORK_DEVICE, brand: 'Cisco', model: 'CBS250', serialNumber: 'CAL-CBS-250-09', location: 'Control room rack', status: HardwareAssetStatus.ACTIVE, notes: 'Core switch for the dashboard network.', vendorSupportUrl: cbs250.vendorSupportUrl } }),
    prisma.hardwareAsset.create({ data: { clientId: bharat.id, amcId: bharatAmc.id, hardwareModelId: pm43.id, category: HardwareCategory.PRINTER, brand: 'Honeywell', model: 'PM43', serialNumber: 'BHP-PM43-003', location: 'Packing line 2', status: HardwareAssetStatus.ACTIVE, notes: 'Standalone hardware-only client printer.', vendorSupportUrl: pm43.vendorSupportUrl } }),
  ]);

  const [printerTopic, scannerTopic, networkTopic, warehouseSop, crmSop, caltechSop] = await Promise.all([
    prisma.supportTopic.create({ data: { scope: SupportTopicScope.HARDWARE_CATEGORY, kind: SupportTopicKind.PLAYBOOK, supportType: SupportType.HARDWARE, status: KnowledgeStatus.PUBLISHED, title: 'Universal printer not printing flow', summary: 'Safe frontline diagnostics for printers.', content: 'Check power, connection, labels/ribbon, error lights, and test print. Escalate for firmware, print-head, or model-specific failures.', hardwareCategory: HardwareCategory.PRINTER, sortOrder: 1 } }),
    prisma.supportTopic.create({ data: { scope: SupportTopicScope.HARDWARE_CATEGORY, kind: SupportTopicKind.PLAYBOOK, supportType: SupportType.HARDWARE, status: KnowledgeStatus.PUBLISHED, title: 'Universal scanner not detected flow', summary: 'Cable, driver, and scan-test checks.', content: 'Check cable, detection in OS, test scan once, then escalate with workstation and model details if still not detected.', hardwareCategory: HardwareCategory.SCANNER, sortOrder: 2 } }),
    prisma.supportTopic.create({ data: { scope: SupportTopicScope.HARDWARE_CATEGORY, kind: SupportTopicKind.PLAYBOOK, supportType: SupportType.HARDWARE, status: KnowledgeStatus.PUBLISHED, title: 'Universal network device offline flow', summary: 'Basic uplink and reachability checks.', content: 'Check power, uplink lights, whether multiple users are affected, and IP reachability before escalating.', hardwareCategory: HardwareCategory.NETWORK_DEVICE, sortOrder: 3 } }),
    prisma.supportTopic.create({ data: { scope: SupportTopicScope.PROJECT, kind: SupportTopicKind.SOP, supportType: SupportType.SOFTWARE, status: KnowledgeStatus.PUBLISHED, title: 'Warehouse Portal label reprint SOP', summary: 'How to safely reprint a label.', content: 'Open Dispatch > Recent Jobs, select the job, and click Reprint Label. Escalate if the job record is missing or reprint is disabled.', projectId: warehousePortal.id, sortOrder: 1 } }),
    prisma.supportTopic.create({ data: { scope: SupportTopicScope.PROJECT, kind: SupportTopicKind.SOP, supportType: SupportType.SOFTWARE, status: KnowledgeStatus.PUBLISHED, title: 'CRM Dashboard access checklist', summary: 'Collect the minimum evidence before escalation.', content: 'Capture user ID, screen, expected result, actual result, screenshot, and timestamp before escalating for access review.', projectId: crmDashboard.id, sortOrder: 1 } }),
    prisma.supportTopic.create({ data: { scope: SupportTopicScope.PROJECT, kind: SupportTopicKind.SOP, supportType: SupportType.SOFTWARE, status: KnowledgeStatus.PUBLISHED, title: 'CalTech Project workflow retry guide', summary: 'Safe retry sequence for stuck workflow steps.', content: 'Refresh, retry once, confirm network stability, and capture the record ID before escalating.', projectId: caltechProject.id, sortOrder: 1 } }),
  ]);

  await prisma.runbook.createMany({ data: [
    { title: 'Reset user password safely', content: 'Validate user identity, reset once, and force a password change on next sign in.', category: 'Authentication', status: KnowledgeStatus.PUBLISHED, publishedAt: daysAgo(10), createdById: pm.id },
    { title: 'Capture support evidence', content: 'Collect screen name, action attempted, expected result, actual result, screenshot, and timestamp.', category: 'Diagnostics', status: KnowledgeStatus.PUBLISHED, publishedAt: daysAgo(9), createdById: pm.id },
  ] });

  await prisma.projectDoc.createMany({ data: [
    { projectId: warehousePortal.id, title: 'Warehouse Portal operator notes', content: 'Use dispatch queue and label reprint flow first. Printer issues may require checking the linked Honeywell asset.', status: KnowledgeStatus.PUBLISHED, publishedAt: daysAgo(8), createdById: se3.id },
    { projectId: crmDashboard.id, title: 'CRM Dashboard support notes', content: 'Focus on user access, lead sync, and dashboard refresh issues before escalating.', status: KnowledgeStatus.PUBLISHED, publishedAt: daysAgo(7), createdById: se3.id },
    { projectId: caltechProject.id, title: 'CalTech Project support notes', content: 'Collect the exact workflow step, record reference, and screenshot before escalating.', status: KnowledgeStatus.PUBLISHED, publishedAt: daysAgo(6), createdById: se3.id },
  ] });

  await prisma.faq.createMany({ data: [
    { projectId: warehousePortal.id, question: 'How do I reprint a label?', answer: 'Open Dispatch > Recent Jobs, choose the job, and click Reprint Label.', sortOrder: 1 },
    { projectId: warehousePortal.id, question: 'What if the printer is online but nothing prints?', answer: 'Use the printer playbook first and escalate if the test print fails.', sortOrder: 2 },
    { projectId: crmDashboard.id, question: 'Why is a user missing from the assignee list?', answer: 'Capture the user, role, and screen context, then escalate for permission review.', sortOrder: 1 },
    { projectId: caltechProject.id, question: 'What do I share when a workflow fails?', answer: 'Share the screen name, action, expected result, actual result, and screenshot.', sortOrder: 1 },
  ] });

  const [activeChat, escalatedChat] = await Promise.all([
    prisma.chatSession.create({ data: { projectId: warehousePortal.id, clientName: 'Nilesh Operator', clientEmail: 'nilesh@acme-logistics.com', status: ChatSessionStatus.ACTIVE, createdAt: daysAgo(2), messages: { create: [{ role: ChatRole.USER, content: 'How do I reprint the last label?', createdAt: daysAgo(2) }, { role: ChatRole.JULIA, content: 'Open Dispatch > Recent Jobs, select the job, and click Reprint Label.', createdAt: hoursAfter(daysAgo(2), 0.1) }] } } }),
    prisma.chatSession.create({ data: { projectId: warehousePortal.id, clientName: 'Rahul Storekeeper', clientEmail: 'rahul@acme-logistics.com', status: ChatSessionStatus.ESCALATED, createdAt: daysAgo(3), endedAt: hoursAfter(daysAgo(3), 0.5), messages: { create: [{ role: ChatRole.USER, content: 'The packing label is not printing even after retry.', createdAt: daysAgo(3) }, { role: ChatRole.JULIA, content: 'Please check printer power, media, and test print once. If it still fails, I can escalate it.', createdAt: hoursAfter(daysAgo(3), 0.1) }, { role: ChatRole.USER, content: 'Still failing. Please escalate.', createdAt: hoursAfter(daysAgo(3), 0.2) }] } } }),
  ]);

  const [activeSession, endedSession, escalatedSession] = await Promise.all([
    prisma.supportSession.create({ data: { source: SupportSessionSource.GENERAL_WIDGET, status: SupportSessionStatus.ACTIVE, supportType: SupportType.HARDWARE, clientId: bharat.id, hardwareAssetId: bharatPrinter.id, requesterName: 'Kiran More', requesterEmail: 'kiran@bharat-packaging.com', requesterPhone: '9888123456', issueSummary: 'Standalone printer is powered on but not printing.', createdAt: daysAgo(1), messages: { create: [{ role: SupportSessionMessageRole.SYSTEM, content: 'Support session started from GENERAL_WIDGET.', createdAt: daysAgo(1) }, { role: SupportSessionMessageRole.USER, content: 'The printer powers on but the label does not come out.', createdAt: hoursAfter(daysAgo(1), 0.08) }, { role: SupportSessionMessageRole.JULIA, content: 'Let us check power, media path, and a test print first.', sourceRefs: { supportTopicIds: [printerTopic.id] }, createdAt: hoursAfter(daysAgo(1), 0.14) }] } } }),
    prisma.supportSession.create({ data: { source: SupportSessionSource.PROJECT_WIDGET, status: SupportSessionStatus.ENDED, supportType: SupportType.SOFTWARE, clientId: caltech.id, projectId: caltechProject.id, selectedTopicId: caltechSop.id, requesterName: 'Rohan Kale', requesterEmail: 'rohan@caltech-industries.com', requesterPhone: '9000011111', issueSummary: 'Needed help retrying a stuck workflow.', supportSummary: 'Julia guided the retry and the user confirmed the workflow continued.', createdAt: daysAgo(4), endedAt: hoursAfter(daysAgo(4), 0.4), messages: { create: [{ role: SupportSessionMessageRole.SYSTEM, content: 'Support session started from PROJECT_WIDGET.', createdAt: daysAgo(4) }, { role: SupportSessionMessageRole.USER, content: 'The workflow is stuck on save.', createdAt: hoursAfter(daysAgo(4), 0.08) }, { role: SupportSessionMessageRole.JULIA, content: 'Refresh the screen and retry once. If it still fails, capture the record ID and screenshot.', sourceRefs: { supportTopicIds: [caltechSop.id] }, createdAt: hoursAfter(daysAgo(4), 0.14) }, { role: SupportSessionMessageRole.USER, content: 'That worked. I can continue now.', createdAt: hoursAfter(daysAgo(4), 0.25) }] } } }),
    prisma.supportSession.create({ data: { source: SupportSessionSource.GENERAL_WIDGET, status: SupportSessionStatus.ESCALATED, supportType: SupportType.HARDWARE, clientId: acme.id, projectId: warehousePortal.id, hardwareAssetId: acmePrinter.id, selectedTopicId: printerTopic.id, requesterName: 'Arun Shah', requesterEmail: 'arun@acme-logistics.com', requesterPhone: '9876543210', issueSummary: 'Warehouse printer has power but test print fails.', supportSummary: 'Universal printer diagnostics were attempted but the device still failed test print.', confidenceScore: 0.42, createdAt: daysAgo(5), escalatedAt: hoursAfter(daysAgo(5), 0.5), endedAt: hoursAfter(daysAgo(5), 0.5), messages: { create: [{ role: SupportSessionMessageRole.SYSTEM, content: 'Support session started from GENERAL_WIDGET.', createdAt: daysAgo(5) }, { role: SupportSessionMessageRole.USER, content: 'The warehouse printer is online but still not printing labels.', createdAt: hoursAfter(daysAgo(5), 0.08) }, { role: SupportSessionMessageRole.JULIA, content: 'Please check power, labels, and the test print path. If the test print still fails, this needs human follow-up.', sourceRefs: { supportTopicIds: [printerTopic.id] }, createdAt: hoursAfter(daysAgo(5), 0.14) }, { role: SupportSessionMessageRole.USER, content: 'Test print still fails. Please escalate.', createdAt: hoursAfter(daysAgo(5), 0.25) }] } } }),
  ]);

  const [supportTicket, widgetTicket, assignedTicket, progressTicket, escalatedTicket, resolvedTicket] = await Promise.all([
    prisma.ticket.create({ data: { clientId: acme.id, projectId: warehousePortal.id, hardwareAssetId: acmePrinter.id, supportSessionId: escalatedSession.id, requesterName: 'Arun Shah', requesterEmail: 'arun@acme-logistics.com', title: 'Acme Logistics: printer test print fails', description: 'Escalated from general support after frontline printer diagnostics failed.', source: TicketSource.GENERAL_WIDGET, supportType: SupportType.HARDWARE, priority: TicketPriority.HIGH, status: TicketStatus.NEW, supportSummary: 'Universal printer diagnostics were attempted but unresolved.', confidenceScore: 0.42, createdAt: hoursAfter(daysAgo(5), 0.55) } }),
    prisma.ticket.create({ data: { clientId: acme.id, projectId: warehousePortal.id, chatSessionId: escalatedChat.id, requesterName: 'Rahul Storekeeper', requesterEmail: 'rahul@acme-logistics.com', emailThreadToken: 'seedthread0001', title: 'Packing label not printing', description: 'Widget escalation from warehouse operations after Julia troubleshooting.', source: TicketSource.PROJECT_WIDGET, supportType: SupportType.SOFTWARE, priority: TicketPriority.MEDIUM, status: TicketStatus.NEW, createdAt: hoursAfter(daysAgo(3), 0.55) } }),
    prisma.ticket.create({ data: { clientId: acme.id, projectId: crmDashboard.id, requesterName: 'Anita Sales', requesterEmail: 'anita@acme-logistics.com', emailThreadToken: 'seedthread0002', title: 'CRM assignee list is missing users', description: 'The assignee dropdown is not showing the expected users.', source: TicketSource.PROJECT_WIDGET, supportType: SupportType.SOFTWARE, priority: TicketPriority.MEDIUM, status: TicketStatus.ASSIGNED, assignedToId: se.id, createdAt: daysAgo(3) } }),
    prisma.ticket.create({ data: { clientId: caltech.id, projectId: caltechProject.id, requesterName: 'Rohan Kale', requesterEmail: 'rohan@caltech-industries.com', emailThreadToken: 'seedthread0003', title: 'CalTech workflow save issue', description: 'A save step intermittently fails during operations workflow.', source: TicketSource.PROJECT_WIDGET, supportType: SupportType.SOFTWARE, priority: TicketPriority.HIGH, status: TicketStatus.IN_PROGRESS, assignedToId: se.id, createdAt: daysAgo(2) } }),
    prisma.ticket.create({ data: { clientId: acme.id, projectId: warehousePortal.id, requesterName: 'Dispatch Lead', requesterEmail: 'dispatch@acme-logistics.com', title: 'Warehouse Portal dispatch queue is stuck', description: 'The dispatch queue is not moving records to printed state.', source: TicketSource.PROJECT_WIDGET, supportType: SupportType.SOFTWARE, priority: TicketPriority.HIGH, status: TicketStatus.ESCALATED, assignedToId: se3.id, createdAt: daysAgo(6) } }),
    prisma.ticket.create({ data: { clientId: acme.id, projectId: crmDashboard.id, requesterName: 'CRM Supervisor', requesterEmail: 'supervisor@acme-logistics.com', title: 'CRM page refresh issue', description: 'Dashboard metrics were not refreshing correctly.', source: TicketSource.PROJECT_WIDGET, supportType: SupportType.SOFTWARE, priority: TicketPriority.LOW, status: TicketStatus.RESOLVED, assignedToId: se3.id, resolutionSummary: 'Cleared stale cache and verified the dashboard refresh behaviour.', createdAt: daysAgo(8), resolvedAt: hoursAfter(daysAgo(8), 5) } }),
  ]);

  await prisma.escalationHistory.create({ data: { ticketId: escalatedTicket.id, createdById: se.id, fromStatus: TicketStatus.IN_PROGRESS, toStatus: TicketStatus.ESCALATED, fromAssigneeId: se.id, toAssigneeId: se3.id, note: 'Escalated to project specialist after frontline checks did not resolve the queue stall.', createdAt: hoursAfter(escalatedTicket.createdAt, 2) } });

  const seededReply = await prisma.ticketMessage.create({ data: { ticketId: progressTicket.id, userId: se.id, type: MessageType.REPLY, content: 'Please confirm whether the save failure happens for every record or only one record.', createdAt: hoursAfter(progressTicket.createdAt, 0.3) } });
  await prisma.ticketMessage.createMany({ data: [
    { ticketId: widgetTicket.id, userId: null, type: MessageType.SYSTEM, content: 'Ticket created from widget escalation for Rahul Storekeeper.', createdAt: widgetTicket.createdAt },
    { ticketId: assignedTicket.id, userId: null, type: MessageType.SYSTEM, content: 'Ticket assigned to Sanjay Support.', createdAt: assignedTicket.createdAt },
    { ticketId: assignedTicket.id, userId: se.id, type: MessageType.REPLY, content: 'I am checking the CRM role mappings and will update shortly.', createdAt: hoursAfter(assignedTicket.createdAt, 0.4) },
    { ticketId: progressTicket.id, userId: null, type: MessageType.SYSTEM, content: 'Work started by Sanjay Support; status changed to IN_PROGRESS.', createdAt: progressTicket.createdAt },
    { ticketId: progressTicket.id, userId: se.id, type: MessageType.INTERNAL_NOTE, content: 'Observed intermittent save failure after first retry. Capturing logs and browser trace.', createdAt: hoursAfter(progressTicket.createdAt, 0.8) },
    { ticketId: escalatedTicket.id, userId: null, type: MessageType.SYSTEM, content: 'Ticket escalated to Aisha Specialist for review.', createdAt: escalatedTicket.createdAt },
    { ticketId: resolvedTicket.id, userId: null, type: MessageType.SYSTEM, content: 'Ticket resolved after validation with the client.', createdAt: resolvedTicket.resolvedAt! },
  ] });

  const attachmentName = 'seed-caltech-save-log.txt';
  await writeSeedAttachment(attachmentName, 'Seeded browser/network trace for CalTech workflow save issue.');
  await prisma.ticketAttachment.create({ data: { ticketId: progressTicket.id, ticketMessageId: seededReply.id, uploadedById: se.id, originalName: 'caltech-save-log.txt', storedName: attachmentName, mimeType: 'text/plain', sizeBytes: 256, createdAt: hoursAfter(progressTicket.createdAt, 0.31) } });
  await clearOrphanedAttachmentFiles([attachmentName]);

  await prisma.ticketEmail.createMany({ data: [
    { ticketId: progressTicket.id, ticketMessageId: seededReply.id, createdById: se.id, direction: TicketEmailDirection.OUTBOUND, status: TicketEmailStatus.SENT, subject: `Update on ${progressTicket.title} [ATC:${progressTicket.emailThreadToken}]`, bodyText: 'Please confirm whether the issue still persists after the latest retry.', fromName: 'ATC Support', fromEmail: 'support@localhost', toName: progressTicket.requesterName, toEmail: progressTicket.requesterEmail!, providerMessageId: 'seed-mail-1', createdAt: hoursAfter(progressTicket.createdAt, 1), deliveredAt: hoursAfter(progressTicket.createdAt, 1) },
    { ticketId: progressTicket.id, createdById: null, direction: TicketEmailDirection.INBOUND, status: TicketEmailStatus.RECEIVED, subject: `Re: ${progressTicket.title} [ATC:${progressTicket.emailThreadToken}]`, bodyText: 'The same save issue is still happening for one record.', fromName: progressTicket.requesterName, fromEmail: progressTicket.requesterEmail!, toName: 'ATC Support', toEmail: 'support@localhost', createdAt: hoursAfter(progressTicket.createdAt, 2), deliveredAt: hoursAfter(progressTicket.createdAt, 2) },
  ] });

  await prisma.notification.createMany({ data: [
    { userId: pm.id, type: NotificationType.TICKET_CREATED, title: `New support escalation: ${supportTicket.title}`, body: 'General hardware support escalated into the human queue.', link: `/agent/tickets/${supportTicket.id}/summary`, createdAt: hoursAfter(supportTicket.createdAt, 0.1) },
    { userId: se.id, type: NotificationType.TICKET_ASSIGNED, title: `Ticket assigned: ${assignedTicket.title}`, body: 'This CRM issue is assigned to you.', link: `/agent/tickets/${assignedTicket.id}/summary`, createdAt: hoursAfter(assignedTicket.createdAt, 0.1) },
    { userId: se3.id, type: NotificationType.TICKET_ESCALATED, title: `Ticket escalated: ${escalatedTicket.title}`, body: 'Warehouse queue issue needs specialist review.', link: `/agent/tickets/${escalatedTicket.id}/summary`, createdAt: hoursAfter(escalatedTicket.createdAt, 2.1) },
  ] });

  console.log('Seed completed successfully.');
  console.log('Mode: small');
  console.log('Playground dataset generated: 3 users, 3 clients, 3 projects, 4 hardware assets, 6 support topics, 6 tickets.');
  console.log(`PM: ${pm.email} / ${password}`);
  console.log(`SE1: ${se.email} / ${password}`);
  console.log(`SE3: ${se3.email} / ${password}`);
  console.log(`Warehouse widget: ${warehousePortal.widgetKey}`);
  console.log(`CalTech widget: ${caltechProject.widgetKey}`);
  console.log(`Active chat session: ${activeChat.id}`);
  console.log(`Active support session: ${activeSession.id}`);
  console.log(`Ended support session: ${endedSession.id}`);
  console.log(`Extra support topics ready for hardware: ${scannerTopic.id}, ${networkTopic.id}, plus project topics ${warehouseSop.id} and ${crmSop.id}`);
}
