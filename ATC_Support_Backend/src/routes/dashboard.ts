import { Role, TicketStatus } from '@prisma/client';
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
      const [totalClients, totalProjects, totalOpenTickets, totalResolvedTickets, totalRunbooks] = await Promise.all([
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
      ]);

      return res.json({
        role: user.role,
        totalClients,
        totalProjects,
        totalOpenTickets,
        totalResolvedTickets,
        totalRunbooks,
      });
    }

    if (hasProjectScopedAccess(user)) {
      const [openTickets, resolvedTickets, totalDocs, totalFaqs] = await Promise.all([
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
      ]);

      return res.json({
        role: user.role,
        openTickets,
        resolvedTickets,
        totalDocs,
        totalFaqs,
      });
    }

    const [unassignedTickets, myOpenTickets, myResolvedTickets] = await Promise.all([
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
    ]);

    return res.json({
      role: user.role,
      unassignedTickets,
      myOpenTickets,
      myResolvedTickets,
    });
  }),
);

export default router;
