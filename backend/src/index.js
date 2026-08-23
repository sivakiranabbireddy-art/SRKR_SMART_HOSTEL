require('dotenv').config();
const app = require('./app');
const prisma = require('./lib/prisma');

const PORT = process.env.PORT || 5000;

async function main() {
  try {
    if (prisma.$connect) {
      try {
        await prisma.$connect();
        console.log('✅ Database connected');

        // Check if database needs initial seeding
        try {
          const userCount = await prisma.user.count();
          if (userCount === 0) {
            console.log('🌱 Empty database detected. Running seed script...');
            const bcrypt = require('bcryptjs');
            const hash = (pwd) => bcrypt.hashSync(pwd, 12);
            await prisma.user.createMany({
              data: [
                { email: 'admin@hostelsync.com', passwordHash: hash('Admin@123'), role: 'ADMIN', approvalStatus: 'APPROVED' },
                { email: 'management@hostelsync.com', passwordHash: hash('Manage@123'), role: 'MANAGEMENT', approvalStatus: 'APPROVED' },
                { email: 'arjun.sharma@student.com', passwordHash: hash('Student@123'), role: 'STUDENT', approvalStatus: 'APPROVED' },
              ],
            });
            console.log('✅ Default Admin, Management, and Student accounts created successfully!');
          }
        } catch (seedErr) {
          console.warn('⚠️ Auto-seed check notice:', seedErr.message);
        }
      } catch (dbErr) {
        console.warn('⚠️ Remote database connection warning:', dbErr.message);
      }
    }

    const { verifyEmailTransporter } = require('./services/email.service');
    const emailStatus = await verifyEmailTransporter();
    if (emailStatus.configured && emailStatus.provider === 'emailjs') {
      console.log(`✉️  Email service ready (EmailJS Service: ${emailStatus.serviceId})`);
    } else if (emailStatus.configured && emailStatus.status === 'connected') {
      console.log(`✉️  Email service ready (SMTP: ${emailStatus.user})`);
    } else if (emailStatus.configured && emailStatus.status === 'auth_failed') {
      console.warn(`⚠️  Email authentication failed: ${emailStatus.error}`);
    } else {
      console.log(`ℹ️  Email service not configured (Set EmailJS keys or EMAIL_USER/EMAIL_PASSWORD in backend/.env to deliver real OTPs).`);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SRKR SMART HOSTEL API running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Test accounts ready:`);
      console.log(`     - Admin:      admin@hostelsync.com / Admin@123`);
      console.log(`     - Student:    arjun.sharma@student.com / Student@123`);
      console.log(`     - Management: management@hostelsync.com / Manage@123`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  if (prisma.$disconnect) await prisma.$disconnect();
  process.exit(0);
});

main();
