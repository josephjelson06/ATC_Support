import { randomBytes } from 'node:crypto';

import { prisma } from '../lib/prisma';

export const generateWidgetKey = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = randomBytes(18).toString('base64url');
    const existingProject = await prisma.project.findUnique({
      where: {
        widgetKey: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existingProject) {
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique widget key.');
};
