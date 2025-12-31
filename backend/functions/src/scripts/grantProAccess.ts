/**
 * Script to grant Pro access to a user by email
 *
 * Usage:
 *   npx ts-node src/scripts/grantProAccess.ts <email>
 *
 * Example:
 *   npx ts-node src/scripts/grantProAccess.ts davidwoguya@gmail.com
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function grantProAccess(email: string) {
  console.log(`\n🔍 Looking up user with email: ${email}\n`);

  try {
    // Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      console.log(
        "\nMake sure the user has signed in to the app at least once."
      );
      return;
    }

    console.log(`✅ Found user:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Supabase ID: ${user.supabaseUserId}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.displayName || "N/A"}`);
    console.log(
      `   Current Subscription: ${user.subscription?.status || "NONE"}\n`
    );

    // Create or update subscription to PRO
    const subscription = await prisma.subscription.upsert({
      where: {
        userId: user.id,
      },
      update: {
        status: "PRO",
        tier: "PRO",
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        autoRenew: false,
        maxCitiesPerWeek: 100,
        maxPlansPerCity: 50,
        weekendAccess: true,
        groupPlansAccess: true,
        savedCitiesAccess: true,
        productId: "com.litplan.pro.yearly.test",
        transactionId: `test_${Date.now()}`,
      },
      create: {
        userId: user.id,
        supabaseUserId: user.supabaseUserId,
        status: "PRO",
        tier: "PRO",
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        autoRenew: false,
        maxCitiesPerWeek: 100,
        maxPlansPerCity: 50,
        weekendAccess: true,
        groupPlansAccess: true,
        savedCitiesAccess: true,
        productId: "com.litplan.pro.yearly.test",
        transactionId: `test_${Date.now()}`,
      },
    });

    console.log(`🎉 SUCCESS! Pro access granted to ${email}`);
    console.log(`\nSubscription details:`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Tier: ${subscription.tier}`);
    console.log(`   Start Date: ${subscription.startDate}`);
    console.log(`   Expiry Date: ${subscription.expiryDate}`);
    console.log(`   Cities/Week: ${subscription.maxCitiesPerWeek}`);
    console.log(`   Plans/City: ${subscription.maxPlansPerCity}`);
    console.log(`   Weekend Access: ${subscription.weekendAccess}`);
    console.log(`   Group Plans: ${subscription.groupPlansAccess}`);
    console.log(`   Save Cities: ${subscription.savedCitiesAccess}`);
    console.log(`\n✨ The user can now access all Pro features!\n`);
  } catch (error) {
    console.error("❌ Error granting Pro access:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function revokeProAccess(email: string) {
  console.log(`\n🔍 Revoking Pro access for: ${email}\n`);

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      return;
    }

    await prisma.subscription.update({
      where: {
        userId: user.id,
      },
      data: {
        status: "FREE",
        tier: "FREE",
        expiryDate: null,
        maxCitiesPerWeek: 1,
        maxPlansPerCity: 10,
        weekendAccess: false,
        groupPlansAccess: false,
        savedCitiesAccess: false,
      },
    });

    console.log(`✅ Pro access revoked for ${email}`);
  } catch (error) {
    console.error("❌ Error revoking Pro access:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function listProUsers() {
  console.log(`\n📋 Listing all Pro users:\n`);

  try {
    const proUsers = await prisma.subscription.findMany({
      where: {
        status: "PRO",
      },
      include: {
        user: true,
      },
    });

    if (proUsers.length === 0) {
      console.log("No Pro users found.");
      return;
    }

    proUsers.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.user.email || "No email"}`);
      console.log(`   Name: ${sub.user.displayName || "N/A"}`);
      console.log(`   Expires: ${sub.expiryDate || "Never"}`);
      console.log("");
    });

    console.log(`Total Pro users: ${proUsers.length}\n`);
  } catch (error) {
    console.error("❌ Error listing Pro users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (command === "--list") {
  listProUsers();
} else if (command === "--revoke" && args[1]) {
  revokeProAccess(args[1]);
} else if (command && !command.startsWith("--")) {
  grantProAccess(command);
} else {
  console.log(`
📱 Litplan Pro Access Management Script

Usage:
  npx ts-node src/scripts/grantProAccess.ts <email>        Grant Pro access
  npx ts-node src/scripts/grantProAccess.ts --revoke <email>  Revoke Pro access
  npx ts-node src/scripts/grantProAccess.ts --list         List all Pro users

Examples:
  npx ts-node src/scripts/grantProAccess.ts davidwoguya@gmail.com
  npx ts-node src/scripts/grantProAccess.ts --revoke test@example.com
  npx ts-node src/scripts/grantProAccess.ts --list
`);
}
