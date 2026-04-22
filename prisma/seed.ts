import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create Super Admin
  const superAdminPassword = await bcrypt.hash('SuperAdmin@123', 12);
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'admin@mobimgr.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@mobimgr.com',
      passwordHash: superAdminPassword,
    },
  });
  console.log('Created SuperAdmin:', superAdmin.email);

  // Create Plans
  const plans = [
    {
      name: 'Starter',
      priceMonthly: 199,
      priceYearly: 1799,
      maxProducts: 500,
      maxSubAdmins: 0,
      maxShops: 1,
      aiEnabled: false,
      features: JSON.stringify([
        '500 Products',
        '1 Shop',
        'Basic Sales Reports',
        'Repair Tracking',
        'Email Support',
      ]),
    },
    {
      name: 'Pro',
      priceMonthly: 399,
      priceYearly: 3499,
      maxProducts: null,
      maxSubAdmins: 2,
      maxShops: 3,
      aiEnabled: false,
      features: JSON.stringify([
        'Unlimited Products',
        '3 Shops',
        'Advanced Reports',
        'Repair Tracking',
        'Sub-Admin Access (2)',
        'Low Stock Alerts',
        'Commission Tracking',
        'Priority Support',
      ]),
    },
    {
      name: 'Elite',
      priceMonthly: 699,
      priceYearly: 5999,
      maxProducts: null,
      maxSubAdmins: 10,
      maxShops: null,
      aiEnabled: true,
      features: JSON.stringify([
        'Unlimited Products',
        'Unlimited Shops',
        'Advanced Reports',
        'Repair Tracking',
        'Sub-Admin Access (10)',
        'Low Stock Alerts',
        'Commission Tracking',
        'AI Marketing',
        'Festival Offers',
        'Premium Support',
      ]),
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
    console.log('Created/Updated Plan:', plan.name);
  }

  // Create Test Admin with PENDING status
  const testAdminPassword = await bcrypt.hash('Test@1234', 12);
  const testAdmin = await prisma.admin.upsert({
    where: { email: 'test@shop.com' },
    update: {},
    create: {
      shopName: 'Test Mobile Shop',
      ownerName: 'Ramesh Kumar',
      email: 'test@shop.com',
      phone: '9876543210',
      passwordHash: testAdminPassword,
      city: 'Mumbai',
      state: 'Maharashtra',
      address: '123 Test Street, Andheri West',
      verificationStatus: 'PENDING',
      aadhaarDocUrl: '/uploads/test/aadhaar.jpg',
      panDocUrl: '/uploads/test/pan.jpg',
      shopActDocUrl: '/uploads/test/shopact.jpg',
    },
  });
  console.log('Created Test Admin:', testAdmin.email, '- Status:', testAdmin.verificationStatus);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
