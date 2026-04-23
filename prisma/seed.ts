import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!/[@$!%*?&]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (@$!%*?&)' };
  }
  return { valid: true };
}

async function main() {
  console.log('\n=== MobiManager Super Admin Setup ===\n');

  // Check if SuperAdmin already exists
  const existingCount = await prisma.superAdmin.count();
  if (existingCount > 0) {
    // Update password for existing super admin
    console.log('\n🔄 Super Admin exists. Updating password...\n');
    const rl = createReadline();

    const email = await askQuestion(rl, 'Enter super admin email (to update password): ');

    let password: string;
    while (true) {
      password = await askQuestion(rl, 'Enter NEW password (min 12 chars, must have uppercase, lowercase, number, special char): ');
      const validation = validatePassword(password);
      if (!validation.valid) {
        console.log(`\n❌ ${validation.error}`);
        continue;
      }
      const confirmPassword = await askQuestion(rl, 'Confirm password: ');
      if (password !== confirmPassword) {
        console.log('\n❌ Passwords do not match');
        continue;
      }
      break;
    }

    rl.close();

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.superAdmin.update({
      where: { email },
      data: { passwordHash },
    });
    console.log(`✅ Password updated for: ${email}`);
    console.log('\n⚠️  Clear terminal history: history -c\n');
    await prisma.$disconnect();
    process.exit(0);
  }

  const rl = createReadline();

  try {
    // Get Super Admin details interactively
    const name = await askQuestion(rl, 'Enter your name: ');
    if (!name || name.length < 2) {
      console.log('\n❌ Name must be at least 2 characters');
      await rl.close();
      await prisma.$disconnect();
      process.exit(1);
    }

    const email = await askQuestion(rl, 'Enter email: ');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log('\n❌ Invalid email format');
      await rl.close();
      await prisma.$disconnect();
      process.exit(1);
    }

    // Check if email already exists
    const existingEmail = await prisma.superAdmin.findUnique({ where: { email } });
    if (existingEmail) {
      console.log('\n❌ Email already exists in database');
      await rl.close();
      await prisma.$disconnect();
      process.exit(1);
    }

    let password: string;
    while (true) {
      password = await askQuestion(rl, 'Enter password (min 12 chars, must have uppercase, lowercase, number, special char): ');
      const validation = validatePassword(password);
      if (!validation.valid) {
        console.log(`\n❌ ${validation.error}`);
        continue;
      }
      const confirmPassword = await askQuestion(rl, 'Confirm password: ');
      if (password !== confirmPassword) {
        console.log('\n❌ Passwords do not match');
        continue;
      }
      break;
    }

    rl.close();

    console.log('\n--- Creating Super Admin ---');

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create Super Admin
    const superAdmin = await prisma.superAdmin.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    console.log(`✅ Super Admin created!`);
    console.log(`   Name: ${superAdmin.name}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log('\n⚠️  Clear terminal history: history -c\n');

    // Seed Plans
    console.log('--- Seeding Plans ---');

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
      console.log(`   ✅ Plan: ${plan.name}`);
    }

    console.log('\n✅ Seed completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Seed error:', error);
    await rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });