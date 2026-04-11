import { HardwareCategory, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { asyncHandler, parseId } from '../utils/http';
import { serializeHardwareBrand, serializeHardwareModel } from '../utils/serializers';

const router = Router();

const hardwareBrandSchema = z.object({
  category: z.nativeEnum(HardwareCategory),
  name: z.string().trim().min(2),
  vendorSupportUrl: z.string().trim().url().or(z.literal('')).optional(),
});

const updateHardwareBrandSchema = hardwareBrandSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

const hardwareModelSchema = z.object({
  hardwareBrandId: z.number().int().positive(),
  name: z.string().trim().min(2),
  notes: z.string().trim().optional(),
  vendorSupportUrl: z.string().trim().url().or(z.literal('')).optional(),
});

const updateHardwareModelSchema = hardwareModelSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

const brandInclude = {
  _count: {
    select: {
      hardwareModels: true,
    },
  },
} as const;

const modelInclude = {
  hardwareBrand: true,
  _count: {
    select: {
      hardwareAssets: true,
    },
  },
} as const;

router.get(
  '/hardware-catalog/brands',
  asyncHandler(async (req, res) => {
    const category = req.query.category ? String(req.query.category) : undefined;
    const brands = await prisma.hardwareBrand.findMany({
      where: category ? { category: category as HardwareCategory } : undefined,
      include: brandInclude,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    res.json(brands.map((brand) => serializeHardwareBrand(brand)));
  }),
);

router.post(
  '/hardware-catalog/brands',
  requireRole(Role.PM),
  validate(hardwareBrandSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof hardwareBrandSchema>;
    const brand = await prisma.hardwareBrand.create({
      data: {
        category: payload.category,
        name: payload.name,
        vendorSupportUrl: payload.vendorSupportUrl || null,
      },
      include: brandInclude,
    });

    res.status(201).json(serializeHardwareBrand(brand));
  }),
);

router.patch(
  '/hardware-catalog/brands/:id',
  requireRole(Role.PM),
  validate(updateHardwareBrandSchema),
  asyncHandler(async (req, res) => {
    const brandId = parseId(req.params.id, 'hardware brand id');
    const payload = req.body as z.infer<typeof updateHardwareBrandSchema>;
    const brand = await prisma.hardwareBrand.update({
      where: {
        id: brandId,
      },
      data: {
        ...(payload.category !== undefined ? { category: payload.category } : {}),
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.vendorSupportUrl !== undefined ? { vendorSupportUrl: payload.vendorSupportUrl || null } : {}),
      },
      include: brandInclude,
    });

    res.json(serializeHardwareBrand(brand));
  }),
);

router.delete(
  '/hardware-catalog/brands/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const brandId = parseId(req.params.id, 'hardware brand id');
    await prisma.hardwareBrand.delete({
      where: {
        id: brandId,
      },
    });

    res.status(204).send();
  }),
);

router.get(
  '/hardware-catalog/models',
  asyncHandler(async (req, res) => {
    const category = req.query.category ? String(req.query.category) : undefined;
    const hardwareBrandId = req.query.hardwareBrandId ? Number(req.query.hardwareBrandId) : undefined;
    const models = await prisma.hardwareModel.findMany({
      where: {
        ...(category ? { category: category as HardwareCategory } : {}),
        ...(hardwareBrandId ? { hardwareBrandId } : {}),
      },
      include: modelInclude,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    res.json(models.map((model) => serializeHardwareModel(model)));
  }),
);

router.post(
  '/hardware-catalog/models',
  requireRole(Role.PM),
  validate(hardwareModelSchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof hardwareModelSchema>;
    const hardwareBrand = await prisma.hardwareBrand.findUniqueOrThrow({
      where: {
        id: payload.hardwareBrandId,
      },
      select: {
        category: true,
      },
    });

    const model = await prisma.hardwareModel.create({
      data: {
        hardwareBrandId: payload.hardwareBrandId,
        category: hardwareBrand.category,
        name: payload.name,
        notes: payload.notes || null,
        vendorSupportUrl: payload.vendorSupportUrl || null,
      },
      include: modelInclude,
    });

    res.status(201).json(serializeHardwareModel(model));
  }),
);

router.patch(
  '/hardware-catalog/models/:id',
  requireRole(Role.PM),
  validate(updateHardwareModelSchema),
  asyncHandler(async (req, res) => {
    const modelId = parseId(req.params.id, 'hardware model id');
    const payload = req.body as z.infer<typeof updateHardwareModelSchema>;
    const currentModel = await prisma.hardwareModel.findUniqueOrThrow({
      where: {
        id: modelId,
      },
      include: {
        hardwareBrand: true,
      },
    });

    let nextBrandId = currentModel.hardwareBrandId;
    let nextCategory = currentModel.category;

    if (payload.hardwareBrandId !== undefined) {
      const nextBrand = await prisma.hardwareBrand.findUniqueOrThrow({
        where: {
          id: payload.hardwareBrandId,
        },
        select: {
          id: true,
          category: true,
        },
      });
      nextBrandId = nextBrand.id;
      nextCategory = nextBrand.category;
    }

    const model = await prisma.hardwareModel.update({
      where: {
        id: modelId,
      },
      data: {
        ...(payload.hardwareBrandId !== undefined ? { hardwareBrandId: nextBrandId } : {}),
        category: nextCategory,
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes || null } : {}),
        ...(payload.vendorSupportUrl !== undefined ? { vendorSupportUrl: payload.vendorSupportUrl || null } : {}),
      },
      include: modelInclude,
    });

    res.json(serializeHardwareModel(model));
  }),
);

router.delete(
  '/hardware-catalog/models/:id',
  requireRole(Role.PM),
  asyncHandler(async (req, res) => {
    const modelId = parseId(req.params.id, 'hardware model id');
    await prisma.hardwareModel.delete({
      where: {
        id: modelId,
      },
    });

    res.status(204).send();
  }),
);

export default router;
