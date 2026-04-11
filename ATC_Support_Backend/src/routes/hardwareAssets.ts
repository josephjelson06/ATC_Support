import { HardwareAssetStatus, HardwareCategory, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, badRequest, notFound, parseId } from '../utils/http';
import { serializeHardwareAsset } from '../utils/serializers';

const router = Router();

const hardwareAssetSchema = z.object({
  projectId: z.number().int().positive().nullable().optional(),
  amcId: z.number().int().positive().nullable().optional(),
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
} as const;

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

    await assertClientScopedLinks(clientId, payload.projectId, payload.amcId);

    const hardwareAsset = await prisma.hardwareAsset.create({
      data: {
        clientId,
        projectId: payload.projectId ?? null,
        amcId: payload.amcId ?? null,
        category: payload.category ?? HardwareCategory.OTHER,
        brand: payload.brand || null,
        model: payload.model || null,
        serialNumber: payload.serialNumber || null,
        location: payload.location || null,
        status: payload.status ?? HardwareAssetStatus.ACTIVE,
        notes: payload.notes || null,
        vendorSupportUrl: payload.vendorSupportUrl || null,
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
        ...(payload.category !== undefined ? { category: payload.category } : {}),
        ...(payload.brand !== undefined ? { brand: payload.brand || null } : {}),
        ...(payload.model !== undefined ? { model: payload.model || null } : {}),
        ...(payload.serialNumber !== undefined ? { serialNumber: payload.serialNumber || null } : {}),
        ...(payload.location !== undefined ? { location: payload.location || null } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes || null } : {}),
        ...(payload.vendorSupportUrl !== undefined ? { vendorSupportUrl: payload.vendorSupportUrl || null } : {}),
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
