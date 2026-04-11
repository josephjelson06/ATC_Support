import { HardwareAssetStatus, HardwareCategory, Prisma, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { clientScopeForUser, projectScopeForUser } from '../utils/access';
import { asyncHandler, badRequest, notFound, parseId } from '../utils/http';
import { parseSearchEntityId } from '../utils/search';
import { serializeHardwareAsset } from '../utils/serializers';

const router = Router();

const hardwareAssetSchema = z.object({
  projectId: z.number().int().positive().nullable().optional(),
  amcId: z.number().int().positive().nullable().optional(),
  hardwareModelId: z.number().int().positive().nullable().optional(),
  category: z.nativeEnum(HardwareCategory).optional(),
  brand: z.string().trim().optional(),
  model: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  location: z.string().trim().optional(),
  status: z.nativeEnum(HardwareAssetStatus).optional(),
  notes: z.string().trim().optional(),
  vendorSupportUrl: z.string().url().or(z.literal('')).optional(),
});

const include = {
  client: true,
  project: true,
  amc: true,
  hardwareModel: {
    include: {
      hardwareBrand: true,
    },
  },
} as const;

const resolveHardwareCatalogSnapshot = async (payload: z.infer<typeof hardwareAssetSchema>) => {
  if (!payload.hardwareModelId) {
    return {
      hardwareModelId: payload.hardwareModelId ?? null,
      category: payload.category ?? HardwareCategory.OTHER,
      brand: payload.brand || null,
      model: payload.model || null,
      vendorSupportUrl: payload.vendorSupportUrl || null,
    };
  }

  const hardwareModel = await prisma.hardwareModel.findUnique({
    where: {
      id: payload.hardwareModelId,
    },
    include: {
      hardwareBrand: true,
    },
  });

  if (!hardwareModel) {
    throw notFound('Hardware model not found.');
  }

  return {
    hardwareModelId: hardwareModel.id,
    category: hardwareModel.category,
    brand: hardwareModel.hardwareBrand.name,
    model: hardwareModel.name,
    vendorSupportUrl: payload.vendorSupportUrl || hardwareModel.vendorSupportUrl || hardwareModel.hardwareBrand.vendorSupportUrl || null,
  };
};

router.get(
  '/hardware-assets',
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const searchId = parseSearchEntityId(search);
    const category = req.query.category ? String(req.query.category) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;

    const scopeWhere: Prisma.HardwareAssetWhereInput =
      req.user && req.user.scopeMode === 'PROJECT_SCOPED'
        ? {
            OR: [
              { project: projectScopeForUser(req.user) },
              {
                projectId: null,
                client: clientScopeForUser(req.user),
              },
            ],
          }
        : {};

    const where: Prisma.HardwareAssetWhereInput = {
      ...scopeWhere,
      ...(category ? { category: category as HardwareCategory } : {}),
      ...(status ? { status: status as HardwareAssetStatus } : {}),
      ...(clientId ? { clientId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(search
        ? {
            OR: [
              { brand: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { model: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { serialNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { location: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { client: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
              { project: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
              ...(searchId ? [{ id: searchId }] : []),
            ],
          }
        : {}),
    };

    const hardwareAssets = await prisma.hardwareAsset.findMany({
      where,
      include,
      orderBy: [{ category: 'asc' }, { status: 'asc' }, { id: 'asc' }],
    });

    res.json(hardwareAssets.map((asset) => serializeHardwareAsset(asset)));
  }),
);

const assertClientScopedLinks = async (clientId: number, projectId?: number | null, amcId?: number | null) => {
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        clientId: true,
      },
    });

    if (!project) {
      throw notFound('Project not found.');
    }

    if (project.clientId !== clientId) {
      throw badRequest('Project must belong to the selected client.');
    }
  }

  if (amcId) {
    const amc = await prisma.amc.findUnique({
      where: {
        id: amcId,
      },
      select: {
        clientId: true,
      },
    });

    if (!amc) {
      throw notFound('AMC not found.');
    }

    if (amc.clientId !== clientId) {
      throw badRequest('AMC must belong to the selected client.');
    }
  }
};

router.get(
  '/clients/:clientId/hardware-assets',
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.clientId, 'client id');
    const hardwareAssets = await prisma.hardwareAsset.findMany({
      where: {
        clientId,
      },
      include,
      orderBy: [{ status: 'asc' }, { category: 'asc' }, { id: 'asc' }],
    });

    res.json(hardwareAssets.map((asset) => serializeHardwareAsset(asset)));
  }),
);

router.post(
  '/clients/:clientId/hardware-assets',
  requireRole(Role.PM),
  validate(hardwareAssetSchema),
  asyncHandler(async (req, res) => {
    const clientId = parseId(req.params.clientId, 'client id');
    const payload = req.body as z.infer<typeof hardwareAssetSchema>;
    const catalogSnapshot = await resolveHardwareCatalogSnapshot(payload);

    await assertClientScopedLinks(clientId, payload.projectId, payload.amcId);

    const hardwareAsset = await prisma.hardwareAsset.create({
      data: {
        clientId,
        projectId: payload.projectId ?? null,
        amcId: payload.amcId ?? null,
        hardwareModelId: catalogSnapshot.hardwareModelId,
        category: catalogSnapshot.category,
        brand: catalogSnapshot.brand,
        model: catalogSnapshot.model,
        serialNumber: payload.serialNumber || null,
        location: payload.location || null,
        status: payload.status ?? HardwareAssetStatus.ACTIVE,
        notes: payload.notes || null,
        vendorSupportUrl: catalogSnapshot.vendorSupportUrl,
      },
      include,
    });

    res.status(201).json(serializeHardwareAsset(hardwareAsset));
  }),
);

router.patch(
  '/hardware-assets/:id',
  requireRole(Role.PM),
  validate(hardwareAssetSchema),
  asyncHandler(async (req, res) => {
    const hardwareAssetId = parseId(req.params.id, 'hardware asset id');
    const payload = req.body as z.infer<typeof hardwareAssetSchema>;
    const existingHardwareAsset = await prisma.hardwareAsset.findUnique({
      where: {
        id: hardwareAssetId,
      },
    });

    if (!existingHardwareAsset) {
      throw notFound('Hardware asset not found.');
    }

    const catalogSnapshot = await resolveHardwareCatalogSnapshot({
      hardwareModelId: payload.hardwareModelId === undefined ? existingHardwareAsset.hardwareModelId : payload.hardwareModelId,
      category: payload.category === undefined ? existingHardwareAsset.category : payload.category,
      brand: payload.brand === undefined ? existingHardwareAsset.brand || undefined : payload.brand,
      model: payload.model === undefined ? existingHardwareAsset.model || undefined : payload.model,
      vendorSupportUrl: payload.vendorSupportUrl === undefined ? existingHardwareAsset.vendorSupportUrl || undefined : payload.vendorSupportUrl,
      projectId: payload.projectId,
      amcId: payload.amcId,
      status: payload.status,
      location: payload.location,
      notes: payload.notes,
      serialNumber: payload.serialNumber,
    });

    await assertClientScopedLinks(
      existingHardwareAsset.clientId,
      payload.projectId === undefined ? existingHardwareAsset.projectId : payload.projectId,
      payload.amcId === undefined ? existingHardwareAsset.amcId : payload.amcId,
    );

    const hardwareAsset = await prisma.hardwareAsset.update({
      where: {
        id: hardwareAssetId,
      },
      data: {
        ...(payload.projectId !== undefined ? { projectId: payload.projectId } : {}),
        ...(payload.amcId !== undefined ? { amcId: payload.amcId } : {}),
        ...(payload.hardwareModelId !== undefined || payload.category !== undefined || payload.brand !== undefined || payload.model !== undefined || payload.vendorSupportUrl !== undefined
          ? {
              hardwareModelId: catalogSnapshot.hardwareModelId,
              category: catalogSnapshot.category,
              brand: catalogSnapshot.brand,
              model: catalogSnapshot.model,
              vendorSupportUrl: catalogSnapshot.vendorSupportUrl,
            }
          : {}),
        ...(payload.serialNumber !== undefined ? { serialNumber: payload.serialNumber || null } : {}),
        ...(payload.location !== undefined ? { location: payload.location || null } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes || null } : {}),
      },
      include,
    });

    res.json(serializeHardwareAsset(hardwareAsset));
  }),
);

router.delete(
  '/hardware-assets/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const hardwareAssetId = parseId(req.params.id, 'hardware asset id');

    await prisma.hardwareAsset.delete({
      where: {
        id: hardwareAssetId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
