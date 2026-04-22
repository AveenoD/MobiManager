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
  console.log('\n=== Change Super Admin Password ===\n');

  const rl = createReadline();

  try {
    // Get current email
    const email = await askQuestion(rl, 'Enter Super Admin email: ');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log('\n❌ Invalid email format');
      await rl.close();
      await prisma.$disconnect();
      process.exit(1);
    }

    // Find Super Admin
    const superAdmin = await prisma.superAdmin.findUnique({ where: { email } });
    if (!superAdmin) {
      console.log('\n❌ Super Admin not found with this email');
      await rl.close();
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log(`\nFound: ${superAdmin.name} (${superAdmin.email})`);

    // Get current password
    const currentPassword = await askQuestion(rl, 'Enter current password: ');
    const isMatch = await bcrypt.compare(currentPassword, superAdmin.passwordHash);
    if (!isMatch) {
      console.log('\n❌ Current password is incorrect');
      await rl.close();
      await prisma.$disconnect();
      process.exit(1);
    }

    // Get new password
    let newPassword: string;
    while (true) {
      newPassword = await askQuestion(rl, 'Enter new password (min 12 chars, must have uppercase, lowercase, number, special char): ');
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        console.log(`\n❌ ${validation.error}`);
        continue;
      }
      const confirmPassword = await askQuestion(rl, 'Confirm new password: ');
      if (newPassword !== confirmPassword) {
        console.log('\n❌ Passwords do not match');
        continue;
      }
      if (newPassword === currentPassword) {
        console.log('\n❌ New password cannot be the same as current password');
        continue;
      }
      break;
    }

    rl.close();

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update in database
    await prisma.superAdmin.update({
      where: { email },
      data: { passwordHash: newPasswordHash },
    });

    console.log('\n✅ Password changed successfully!');
    console.log('   You can now login with your new password.\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    await rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });