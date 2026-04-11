import { Role, SupportSessionStatus, SupportType, TicketStatus } from '@prisma/client';
import { Router } from 'express';

import { prisma } from '../lib/prisma';
import { hasProjectScopedAccess } from '../utils/userModel';
import { asyncHandler } from '../utils/http';

const router = Router();

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const user = req.user!;

    if (user.role === Role.PM) {
      const [
        totalClients,
        totalProjects,
        totalOpenTickets,
        totalResolvedTickets,
        totalRunbooks,
        totalHardwareAssets,
        activeSupportSessions,
        escalatedSupportSessions,
        hardwareSupportSessions,
        softwareSupportSessions,
      ] = await Promise.all([
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
        prisma.hardwareAsset.count(),
        prisma.supportSession.count({
          where: {
            status: SupportSessionStatus.ACTIVE,
          },
        }),
        prisma.supportSession.count({
          where: {
            status: SupportSessionStatus.ESCALATED,
          },
        }),
        prisma.supportSession.count({
          where: {
            supportType: SupportType.HARDWARE,
          },
        }),
        prisma.supportSession.count({
          where: {
            supportType: SupportType.SOFTWARE,
          },
        }),
      ]);

      return res.json({
        role: user.role,
        totalClients,
        totalProjects,
        totalOpenTickets,
        totalResolvedTickets,
        totalRunbooks,
        totalHardwareAssets,
        activeSupportSessions,
        escalatedSupportSessions,
        hardwareSupportSessions,
        softwareSupportSessions,
      });
    }

    if (hasProjectScopedAccess(user)) {
      const [openTickets, resolvedTickets, totalDocs, totalFaqs, activeSupportSessions] = await Promise.all([
        prisma.ticket.count({
          where: {
            project: {
              OR: [{ assignedToId: user.id }, { memberships: { some: { userId: user.id } } }],
            },
            status: {
              not: TicketStatus.RESOLVED,
            },
          },
        }),
        prisma.ticket.count({
          where: {
            project: {
              OR: [{ assignedToId: user.id }, { memberships: { some: { userId: user.id } } }],
            },
            status: TicketStatus.RESOLVED,
          },
        }),
        prisma.projectDoc.count({
          where: {
            project: {
              OR: [{ assignedToId: user.id }, { memberships: { some: { userId: user.id } } }],
            },
          },
        }),
        prisma.faq.count({
          where: {
            project: {
              OR: [{ assignedToId: user.id }, { memberships: { some: { userId: user.id } } }],
            },
          },
        }),
        prisma.supportSession.count({
          where: {
            project: {
              OR: [{ assignedToId: user.id }, { memberships: { some: { userId: user.id } } }],
            },
            status: SupportSessionStatus.ACTIVE,
          },
        }),
      ]);

      return res.json({
        role: user.role,
        openTickets,
        resolvedTickets,
        totalDocs,
        totalFaqs,
        activeSupportSessions,
      });
    }

    const [unassignedTickets, myOpenTickets, myResolvedTickets, activeSupportSessions] = await Promise.all([
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
      prisma.supportSession.count({
        where: {
          status: SupportSessionStatus.ACTIVE,
        },
      }),
    ]);

    return res.json({
      role: user.role,
      unassignedTickets,
      myOpenTickets,
      myResolvedTickets,
      activeSupportSessions,
    });
  }),
);

export default router;
