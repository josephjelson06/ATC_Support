import { Prisma, SupportSessionSource, SupportSessionStatus, SupportType } from '@prisma/client';
import { Router } from 'express';

import { prisma } from '../lib/prisma';
import { asyncHandler, notFound, parseId } from '../utils/http';
import { createPaginatedResponse, getPaginationOptions } from '../utils/pagination';
import { parseSearchEntityId } from '../utils/search';
import { serializeSupportSession } from '../utils/serializers';

const router = Router();

const listInclude = {
  client: true,
  project: {
    include: {
      client: true,
    },
  },
  hardwareAsset: {
    include: {
      client: true,
      project: true,
      amc: true,
      hardwareModel: {
        include: {
          hardwareBrand: true,
        },
      },
    },
  },
  selectedTopic: true,
  ticket: true,
  _count: {
    select: {
      messages: true,
    },
  },
} as const;

const detailInclude = {
  ...listInclude,
  messages: {
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} as const;

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const searchId = parseSearchEntityId(search);
    const status = req.query.status && Object.values(SupportSessionStatus).includes(String(req.query.status) as SupportSessionStatus)
      ? (String(req.query.status) as SupportSessionStatus)
      : undefined;
    const source = req.query.source && Object.values(SupportSessionSource).includes(String(req.query.source) as SupportSessionSource)
      ? (String(req.query.source) as SupportSessionSource)
      : undefined;
    const supportType = req.query.supportType && Object.values(SupportType).includes(String(req.query.supportType) as SupportType)
      ? (String(req.query.supportType) as SupportType)
      : undefined;
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const hardwareAssetId = req.query.hardwareAssetId ? Number(req.query.hardwareAssetId) : undefined;
    const pagination = getPaginationOptions(req.query as Record<string, unknown>);

    const whereConditions: Prisma.SupportSessionWhereInput[] = [];

    if (status) {
      whereConditions.push({ status });
    }

    if (source) {
      whereConditions.push({ source });
    }

    if (supportType) {
      whereConditions.push({ supportType });
    }

    if (clientId) {
      whereConditions.push({ clientId });
    }

    if (projectId) {
      whereConditions.push({ projectId });
    }

    if (hardwareAssetId) {
      whereConditions.push({ hardwareAssetId });
    }

    if (search) {
      whereConditions.push({
        OR: [
          { requesterName: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { requesterEmail: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { requesterPhone: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { issueSummary: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { supportSummary: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { client: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          { project: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          { hardwareAsset: { model: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          { hardwareAsset: { serialNumber: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          ...(searchId ? [{ id: searchId }] : []),
        ],
      });
    }

    const where: Prisma.SupportSessionWhereInput = whereConditions.length ? { AND: whereConditions } : {};

    if (pagination) {
      const [supportSessions, total] = await prisma.$transaction([
        prisma.supportSession.findMany({
          where,
          include: listInclude,
          orderBy: {
            createdAt: 'desc',
          },
          skip: pagination.skip,
          take: pagination.take,
        }),
        prisma.supportSession.count({ where }),
      ]);

      res.json(createPaginatedResponse(supportSessions.map((session) => serializeSupportSession(session)), total, pagination));
      return;
    }

    const supportSessions = await prisma.supportSession.findMany({
      where,
      include: listInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(supportSessions.map((session) => serializeSupportSession(session)));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const supportSessionId = parseId(req.params.id, 'support session id');
    const supportSession = await prisma.supportSession.findUnique({
      where: {
        id: supportSessionId,
      },
      include: detailInclude,
    });

    if (!supportSession) {
      throw notFound('Support session not found.');
    }

    res.json(serializeSupportSession(supportSession));
  }),
);

export default router;
