const { PrismaClient } = require('@prisma/client');
const { MemoryPrismaStore } = require('./memoryPrisma');

let prisma;
const memoryStore = new MemoryPrismaStore();

if (process.env.USE_MEMORY_STORE === 'true') {
  prisma = memoryStore;
} else {
  try {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  } catch (err) {
    console.warn('⚠️ Could not initialize PrismaClient, using in-memory store:', err.message);
    prisma = memoryStore;
  }
}

module.exports = prisma;
