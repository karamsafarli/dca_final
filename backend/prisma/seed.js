import 'dotenv/config';
import { prisma } from '../src/config/db.js';
import { seedDatabase } from '../src/db/seedData.js';

async function main() {
  console.log('Seeding Baku Urban Crisis database...');
  await seedDatabase(prisma);
  console.log('Database seeded successfully.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
