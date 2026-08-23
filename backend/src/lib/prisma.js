const { PrismaClient } = require('@prisma/client');
const { MemoryPrismaStore } = require('./memoryPrisma');

const NEON_DEFAULT_URL = "postgresql://neondb_owner:npg_y8YZ5HVLFlhb@ep-withered-cell-az6ywf5u-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

let prisma;
const memoryStore = new MemoryPrismaStore();

if (process.env.USE_MEMORY_STORE === 'true') {
  prisma = memoryStore;
} else {
  try {
    const dbUrl = (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1'))
      ? process.env.DATABASE_URL
      : NEON_DEFAULT_URL;

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  } catch (err) {
    console.warn('⚠️ Could not initialize PrismaClient, using in-memory store:', err.message);
    prisma = memoryStore;
  }
}

module.exports = prisma;
