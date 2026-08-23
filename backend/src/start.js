require('dotenv').config();
const { execSync } = require('child_process');

const NEON_DEFAULT_URL = "postgresql://neondb_owner:npg_y8YZ5HVLFlhb@ep-withered-cell-az6ywf5u-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Fallback to Neon Cloud PostgreSQL if DATABASE_URL is missing or pointing to localhost
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')) {
  console.log('🔄 Setting DATABASE_URL to Neon Cloud PostgreSQL instance...');
  process.env.DATABASE_URL = NEON_DEFAULT_URL;
}

if (!process.env.DIRECT_URL || process.env.DIRECT_URL.includes('localhost') || process.env.DIRECT_URL.includes('127.0.0.1')) {
  process.env.DIRECT_URL = process.env.DATABASE_URL || NEON_DEFAULT_URL;
}

// Run prisma db push before starting the server
try {
  console.log('🚀 Running database schema sync...');
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL,
    },
  });
  console.log('✅ Database schema synchronized.');
} catch (err) {
  console.warn('⚠️ Database schema sync notice (continuing startup):', err.message);
}

// Start the Express application
require('./index.js');
