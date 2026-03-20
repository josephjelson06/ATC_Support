import { mkdir, readdir, rm, unlink, writeFile } from 'fs/promises';
import path from 'path';

import type { PrismaClient } from '@prisma/client';

const ATTACHMENT_DIRECTORY = path.resolve(process.cwd(), 'uploads', 'ticket-attachments');

export const password = 'password';

export const createSeededRandom = (seed: number) => {
  let current = seed % 2147483647;

  if (current <= 0) {
    current += 2147483646;
  }

  return () => {
    current = (current * 16807) % 2147483647;
    return (current - 1) / 2147483646;
  };
};

export const pick = <T>(values: T[], random: () => number) => values[Math.floor(random() * values.length)];

export const pickWeighted = <T>(values: Array<{ value: T; weight: number }>, random: () => number) => {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  const threshold = random() * totalWeight;
  let cursor = 0;

  for (const item of values) {
    cursor += item.weight;
    if (threshold <= cursor) {
      return item.value;
    }
  }

  return values[values.length - 1].value;
};

export const intBetween = (min: number, max: number, random: () => number) => min + Math.floor(random() * (max - min + 1));

export const chance = (probability: number, random: () => number) => random() < probability;

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

export const daysAgo = (days: number, hour = 10) => {
  const value = new Date('2026-03-20T10:00:00.000Z');
  value.setUTCDate(value.getUTCDate() - days);
  value.setUTCHours(hour, 0, 0, 0);
  return value;
};

export const hoursAfter = (date: Date, hours: number) => {
  const value = new Date(date);
  value.setTime(value.getTime() + hours * 60 * 60 * 1000);
  return value;
};

export const cleanSeedState = async (prisma: PrismaClient) => {
  await prisma.ticketAttachment.deleteMany();
  await prisma.ticketEmail.deleteMany();
  await prisma.notification.deleteMany();
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

  await rm(ATTACHMENT_DIRECTORY, { recursive: true, force: true });
  await mkdir(ATTACHMENT_DIRECTORY, { recursive: true });
};

export const writeSeedAttachment = async (storedName: string, content: string) => {
  await mkdir(ATTACHMENT_DIRECTORY, { recursive: true });
  await writeFile(path.join(ATTACHMENT_DIRECTORY, storedName), content, 'utf8');
};

export const clearOrphanedAttachmentFiles = async (validStoredNames: string[]) => {
  await mkdir(ATTACHMENT_DIRECTORY, { recursive: true });
  const files = await readdir(ATTACHMENT_DIRECTORY);
  const validNames = new Set(validStoredNames);

  await Promise.all(
    files
      .filter((fileName) => !validNames.has(fileName))
      .map((fileName) => unlink(path.join(ATTACHMENT_DIRECTORY, fileName)).catch(() => undefined)),
  );
};
