import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { getAdapterConnectionString, getAdapterSchema } from '../../src/lib/databaseUrl';
import { seedSmallMode } from './small';

const parseMode = () => {
  const modeArgument = process.argv.find((argument) => argument.startsWith('--mode='));
  return modeArgument?.split('=')[1] || 'small';
};

export async function runSeed() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: getAdapterConnectionString(process.env.DATABASE_URL ?? ''),
    }, {
      schema: getAdapterSchema(process.env.DATABASE_URL ?? ''),
    }),
  });

  const mode = parseMode();

  try {
    if (mode !== 'small') {
      throw new Error(`Unsupported seed mode "${mode}". Supported modes: small`);
    }

    await seedSmallMode(prisma);
  } catch (error) {
    console.error('Seed failed', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
