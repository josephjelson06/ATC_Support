const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const crypto = require('node:crypto');
const { unlink } = require('node:fs/promises');
const path = require('node:path');
const { test, before, after } = require('node:test');

require('dotenv').config();

const { Client } = require('pg');
const supertest = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration_test_jwt_secret_please_change';
process.env.INBOUND_EMAIL_SECRET = process.env.INBOUND_EMAIL_SECRET || 'atc_dev_inbound_secret';

const run = (command) => {
  execSync(command, {
    stdio: 'inherit',
    env: process.env,
  });
};

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required to run integration tests.`);
  }
  return value;
};

const baseDatabaseUrl = new URL(requireEnv('DATABASE_URL'));
const schemaName = `atc_test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
const adminDatabaseUrl = new URL(baseDatabaseUrl);
adminDatabaseUrl.searchParams.delete('schema');
baseDatabaseUrl.searchParams.set('schema', schemaName);
const schemaDatabaseUrl = baseDatabaseUrl.toString();

let app;
let request;
const uploadedAttachmentPaths = new Set();

before(async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('NODE_ENV must be set to test for integration tests.');
  }

  const adminClient = new Client({
    connectionString: adminDatabaseUrl.toString(),
  });

  await adminClient.connect();

  try {
    await adminClient.query(`CREATE SCHEMA "${schemaName}"`);
  } finally {
    await adminClient.end();
  }

  process.env.DATABASE_URL = schemaDatabaseUrl;

  run('npx prisma generate');
  run('npx prisma migrate deploy');
  run('npm run prisma:seed');

  // app is a CommonJS default export (compiled from TS `export default app;`)
  const imported = require('../dist/index.js');
  app = imported.default ?? imported;
  request = supertest(app);
});

after(async () => {
  try {
    const { prisma } = require('../dist/lib/prisma');
    await prisma.$disconnect();
  } catch {
    // Ignore shutdown errors so schema cleanup can run.
  }

  await Promise.all(
    Array.from(uploadedAttachmentPaths).map((attachmentPath) =>
      unlink(attachmentPath).catch(() => {
        // Ignore cleanup errors so schema cleanup can still run.
      }),
    ),
  );

  const adminClient = new Client({
    connectionString: adminDatabaseUrl.toString(),
  });

  await adminClient.connect();

  try {
    await adminClient.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  } finally {
    await adminClient.end();
  }
});

test('auth refresh and logout', async () => {
  const agent = supertest.agent(app);

  const loginResponse = await agent.post('/api/auth/login').send({ email: 'pm@atc.com', password: 'password' }).expect(200);
  assert.ok(loginResponse.headers['x-request-id']);
  assert.ok(loginResponse.body.token);
  assert.equal(loginResponse.body.user.email, 'pm@atc.com');

  const refreshResponse = await agent.post('/api/auth/refresh').expect(200);
  assert.ok(refreshResponse.body.token);
  assert.equal(refreshResponse.body.user.email, 'pm@atc.com');

  await agent.post('/api/auth/logout').expect(204);

  await agent.post('/api/auth/refresh').expect(401);
});

test('widget escalation creates a ticket', async () => {
  const response = await request
    .post('/api/widget/widget_warehouse_portal/escalate')
    .send({
      name: 'Integration Tester',
      email: 'integration@test.com',
      title: 'Integration ticket',
      description: 'Created by integration test.',
      priority: 'HIGH',
    })
    .expect(201);

  assert.ok(response.body.id);
  assert.equal(response.body.status, 'NEW');
  assert.equal(response.body.source, 'WIDGET');
  assert.equal(response.body.project?.widgetKey, 'widget_warehouse_portal');
});

test('ticket notifications can be listed and marked as read', async () => {
  const seLogin = await request.post('/api/auth/login').send({ email: 'se@atc.com', password: 'password' }).expect(200);
  const projectSpecialistLogin = await request.post('/api/auth/login').send({ email: 'se3@atc.com', password: 'password' }).expect(200);

  const seToken = seLogin.body.token;
  const seUser = seLogin.body.user;
  const projectSpecialistToken = projectSpecialistLogin.body.token;

  await request.post('/api/notifications/read-all').set('Authorization', `Bearer ${seToken}`).expect(200);
  await request.post('/api/notifications/read-all').set('Authorization', `Bearer ${projectSpecialistToken}`).expect(200);

  const createdTicket = await request
    .post('/api/widget/widget_warehouse_portal/escalate')
    .send({
      name: 'Notification Tester',
      email: 'integration-notify@test.com',
      title: 'Notification workflow ticket',
      description: 'Ticket for notification integration test.',
      priority: 'MEDIUM',
    })
    .expect(201);

  const ticketId = createdTicket.body.id;
  assert.ok(ticketId);

  const seNotifications = await request
    .get('/api/notifications?limit=10')
    .set('Authorization', `Bearer ${seToken}`)
    .expect(200);

  const seCreatedNotification = seNotifications.body.items.find(
    (notification) => notification.type === 'TICKET_CREATED' && notification.link === `/agent/tickets/${ticketId}/summary`,
  );

  assert.ok(seCreatedNotification);
  assert.equal(seNotifications.body.unreadCount, 1);

  const markedRead = await request
    .post(`/api/notifications/${seCreatedNotification.id}/read`)
    .set('Authorization', `Bearer ${seToken}`)
    .expect(200);

  assert.equal(markedRead.body.isRead, true);
  assert.ok(markedRead.body.readAt);

  const seNotificationsAfterRead = await request
    .get('/api/notifications?limit=10')
    .set('Authorization', `Bearer ${seToken}`)
    .expect(200);

  assert.equal(seNotificationsAfterRead.body.unreadCount, 0);

  const projectSpecialistNotifications = await request
    .get('/api/notifications?limit=10')
    .set('Authorization', `Bearer ${projectSpecialistToken}`)
    .expect(200);

  const projectSpecialistCreatedNotification = projectSpecialistNotifications.body.items.find(
    (notification) => notification.type === 'TICKET_CREATED' && notification.link === `/agent/tickets/${ticketId}/summary`,
  );

  assert.ok(projectSpecialistCreatedNotification);
  assert.equal(projectSpecialistNotifications.body.unreadCount, 1);

  const clearedNotifications = await request
    .post('/api/notifications/read-all')
    .set('Authorization', `Bearer ${projectSpecialistToken}`)
    .expect(200);

  assert.equal(clearedNotifications.body.updatedCount, 1);

  await request
    .post(`/api/tickets/${ticketId}/assign`)
    .set('Authorization', `Bearer ${seToken}`)
    .send({ assignedToId: seUser.id })
    .expect(200);

  await request.post(`/api/tickets/${ticketId}/start`).set('Authorization', `Bearer ${seToken}`).expect(200);

  await request
    .post(`/api/tickets/${ticketId}/escalate`)
    .set('Authorization', `Bearer ${seToken}`)
    .send({ note: 'Escalation notification test.' })
    .expect(200);

  const projectSpecialistNotificationsAfterEscalate = await request
    .get('/api/notifications?limit=10')
    .set('Authorization', `Bearer ${projectSpecialistToken}`)
    .expect(200);

  const projectSpecialistEscalationNotification = projectSpecialistNotificationsAfterEscalate.body.items.find(
    (notification) => notification.type === 'TICKET_ESCALATED' && notification.link === `/agent/tickets/${ticketId}/summary`,
  );

  assert.ok(projectSpecialistEscalationNotification);
  assert.equal(projectSpecialistNotificationsAfterEscalate.body.unreadCount, 1);
});

test('ticket email loop logs outbound messages and accepts inbound replies', async () => {
  const seLogin = await request.post('/api/auth/login').send({ email: 'se@atc.com', password: 'password' }).expect(200);
  const seToken = seLogin.body.token;
  const seUser = seLogin.body.user;

  const createdTicket = await request
    .post('/api/widget/widget_warehouse_portal/escalate')
    .send({
      name: 'Email Tester',
      email: 'integration-email@test.com',
      title: 'Email loop ticket',
      description: 'Ticket for outbound and inbound email loop integration test.',
      priority: 'MEDIUM',
    })
    .expect(201);

  const ticketId = createdTicket.body.id;
  assert.ok(ticketId);
  assert.equal(createdTicket.body.requesterEmail, 'integration-email@test.com');
  assert.ok(createdTicket.body.emailThreadToken);

  await request
    .post(`/api/tickets/${ticketId}/assign`)
    .set('Authorization', `Bearer ${seToken}`)
    .send({ assignedToId: seUser.id })
    .expect(200);

  await request.post(`/api/tickets/${ticketId}/start`).set('Authorization', `Bearer ${seToken}`).expect(200);

  await request
    .post(`/api/tickets/${ticketId}/messages`)
    .set('Authorization', `Bearer ${seToken}`)
    .field('type', 'REPLY')
    .field('content', 'Please confirm whether the issue still persists.')
    .expect(201);

  await request
    .post(`/api/tickets/${ticketId}/waiting-on-customer`)
    .set('Authorization', `Bearer ${seToken}`)
    .send({ note: 'Need confirmation from the customer before proceeding.' })
    .expect(200);

  const ticketBeforeInbound = await request
    .get(`/api/tickets/${ticketId}`)
    .set('Authorization', `Bearer ${seToken}`)
    .expect(200);

  assert.equal(ticketBeforeInbound.body.requesterEmail, 'integration-email@test.com');
  assert.ok(ticketBeforeInbound.body.emailThreadToken);
  assert.equal(ticketBeforeInbound.body.status, 'WAITING_ON_CUSTOMER');

  const outboundEmails = ticketBeforeInbound.body.emailEvents.filter((event) => event.direction === 'OUTBOUND');
  assert.ok(outboundEmails.length >= 3);
  assert.ok(outboundEmails.some((event) => event.subject.includes('[ATC:')));
  assert.ok(outboundEmails.every((event) => event.status === 'LOGGED' || event.status === 'SENT'));

  const inboundSubject = outboundEmails[0].subject;

  const inboundResponse = await request
    .post('/api/email/inbound')
    .set('x-inbound-email-secret', process.env.INBOUND_EMAIL_SECRET)
    .send({
      fromEmail: 'integration-email@test.com',
      fromName: 'Email Tester',
      subject: inboundSubject,
      text: 'The issue is still happening after the latest instructions.',
    })
    .expect(201);

  assert.equal(inboundResponse.body.ticketId, ticketId);
  assert.equal(inboundResponse.body.ticketStatus, 'IN_PROGRESS');

  const ticketAfterInbound = await request
    .get(`/api/tickets/${ticketId}`)
    .set('Authorization', `Bearer ${seToken}`)
    .expect(200);

  assert.equal(ticketAfterInbound.body.status, 'IN_PROGRESS');

  const customerReply = ticketAfterInbound.body.messages.find(
    (message) => message.senderEmail === 'integration-email@test.com' && message.type === 'REPLY',
  );
  assert.ok(customerReply);
  assert.match(customerReply.content, /still happening/i);

  const inboundEmailEvent = ticketAfterInbound.body.emailEvents.find(
    (event) => event.direction === 'INBOUND' && event.status === 'RECEIVED',
  );
  assert.ok(inboundEmailEvent);
  assert.equal(inboundEmailEvent.fromEmail, 'integration-email@test.com');
});

test('ticket lifecycle: assign, start, escalate, resolve', async () => {
  const seLogin = await request.post('/api/auth/login').send({ email: 'se@atc.com', password: 'password' }).expect(200);
  const projectSpecialistLogin = await request.post('/api/auth/login').send({ email: 'se3@atc.com', password: 'password' }).expect(200);

  const seToken = seLogin.body.token;
  const seUser = seLogin.body.user;
  const projectSpecialistToken = projectSpecialistLogin.body.token;
  const projectSpecialistUser = projectSpecialistLogin.body.user;

  assert.ok(seToken);
  assert.ok(projectSpecialistToken);

  const createdTicket = await request
    .post('/api/widget/widget_warehouse_portal/escalate')
    .send({
      name: 'Integration Tester',
      email: 'integration2@test.com',
      title: 'Lifecycle ticket',
      description: 'Ticket for lifecycle integration test.',
      priority: 'MEDIUM',
    })
    .expect(201);

  const ticketId = createdTicket.body.id;
  assert.ok(ticketId);

  const assigned = await request
    .post(`/api/tickets/${ticketId}/assign`)
    .set('Authorization', `Bearer ${seToken}`)
    .send({ assignedToId: seUser.id })
    .expect(200);
  assert.equal(assigned.body.status, 'ASSIGNED');
  assert.equal(assigned.body.assignedToId, seUser.id);

  const started = await request.post(`/api/tickets/${ticketId}/start`).set('Authorization', `Bearer ${seToken}`).expect(200);
  assert.equal(started.body.status, 'IN_PROGRESS');

  const escalated = await request
    .post(`/api/tickets/${ticketId}/escalate`)
    .set('Authorization', `Bearer ${seToken}`)
    .send({ note: 'Needs project specialist review.' })
    .expect(200);
  assert.equal(escalated.body.status, 'ESCALATED');
  assert.equal(escalated.body.assignedToId, projectSpecialistUser.id);

  const resolved = await request
    .post(`/api/tickets/${ticketId}/resolve`)
    .set('Authorization', `Bearer ${projectSpecialistToken}`)
    .send({ resolutionSummary: 'Resolved in integration test.' })
    .expect(200);
  assert.equal(resolved.body.status, 'RESOLVED');
  assert.equal(resolved.body.resolutionSummary, 'Resolved in integration test.');
});

test('ticket messages accept attachments and tickets can wait on customer then reopen', async () => {
  const seLogin = await request.post('/api/auth/login').send({ email: 'se@atc.com', password: 'password' }).expect(200);
  const seToken = seLogin.body.token;
  const seUser = seLogin.body.user;

  assert.ok(seToken);

  const createdTicket = await request
    .post('/api/widget/widget_warehouse_portal/escalate')
    .send({
      name: 'Attachment Tester',
      email: 'integration3@test.com',
      title: 'Attachment workflow ticket',
      description: 'Ticket for attachment and reopen integration test.',
      priority: 'LOW',
    })
    .expect(201);

  const ticketId = createdTicket.body.id;
  assert.ok(ticketId);

  await request
    .post(`/api/tickets/${ticketId}/assign`)
    .set('Authorization', `Bearer ${seToken}`)
    .send({ assignedToId: seUser.id })
    .expect(200);

  await request.post(`/api/tickets/${ticketId}/start`).set('Authorization', `Bearer ${seToken}`).expect(200);

  const messageResponse = await request
    .post(`/api/tickets/${ticketId}/messages`)
    .set('Authorization', `Bearer ${seToken}`)
    .field('type', 'REPLY')
    .field('content', 'Please review the attached log snapshot.')
    .attach('attachments', Buffer.from('error: sample integration log output'), {
      filename: 'integration-log.txt',
      contentType: 'text/plain',
    })
    .expect(201);

  assert.equal(messageResponse.body.type, 'REPLY');
  assert.equal(messageResponse.body.attachments.length, 1);
  assert.equal(messageResponse.body.attachments[0].originalName, 'integration-log.txt');

  const attachment = messageResponse.body.attachments[0];
  uploadedAttachmentPaths.add(path.resolve(process.cwd(), 'uploads', 'ticket-attachments', attachment.storedName));

  const attachmentList = await request
    .get(`/api/tickets/${ticketId}/attachments`)
    .set('Authorization', `Bearer ${seToken}`)
    .expect(200);

  assert.equal(attachmentList.body.length, 1);
  assert.equal(attachmentList.body[0].id, attachment.id);
  assert.equal(attachmentList.body[0].uploadedBy?.id, seUser.id);

  const downloadResponse = await request
    .get(`/api/ticket-attachments/${attachment.id}/download`)
    .set('Authorization', `Bearer ${seToken}`)
    .expect(200);

  assert.match(downloadResponse.headers['content-disposition'], /integration-log\.txt/);
  assert.match(downloadResponse.headers['content-type'], /text\/plain/);

  const waiting = await request
    .post(`/api/tickets/${ticketId}/waiting-on-customer`)
    .set('Authorization', `Bearer ${seToken}`)
    .send({ note: 'Waiting for client confirmation.' })
    .expect(200);

  assert.equal(waiting.body.status, 'WAITING_ON_CUSTOMER');
  assert.equal(waiting.body.assignedToId, seUser.id);

  const resolved = await request
    .post(`/api/tickets/${ticketId}/resolve`)
    .set('Authorization', `Bearer ${seToken}`)
    .send({ resolutionSummary: 'Customer confirmed fix during integration test.' })
    .expect(200);

  assert.equal(resolved.body.status, 'RESOLVED');
  assert.equal(resolved.body.resolutionSummary, 'Customer confirmed fix during integration test.');

  const reopened = await request
    .post(`/api/tickets/${ticketId}/reopen`)
    .set('Authorization', `Bearer ${seToken}`)
    .send({ note: 'Customer reported the issue returned.' })
    .expect(200);

  assert.equal(reopened.body.status, 'REOPENED');
  assert.equal(reopened.body.assignedToId, seUser.id);
  assert.equal(reopened.body.resolutionSummary, null);

  const ticketDetail = await request
    .get(`/api/tickets/${ticketId}`)
    .set('Authorization', `Bearer ${seToken}`)
    .expect(200);

  const replyMessage = ticketDetail.body.messages.find((message) => message.type === 'REPLY');
  assert.ok(replyMessage);
  assert.equal(replyMessage.attachments.length, 1);
  assert.equal(replyMessage.attachments[0].id, attachment.id);

  const systemMessages = ticketDetail.body.messages.filter((message) => message.type === 'SYSTEM').map((message) => message.content);
  assert.ok(systemMessages.some((content) => content.includes('WAITING_ON_CUSTOMER')));
  assert.ok(systemMessages.some((content) => content.includes('ticket reopened')));
});
