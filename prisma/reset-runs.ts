import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Clears every visitor run and empties the leaderboard, leaving the seeded
// challenges alone. Intended for wiping test runs before an event.
async function main() {
  const [users, attempts, submissions, challenges] = await Promise.all([
    prisma.user.count(),
    prisma.attempt.count(),
    prisma.submission.count(),
    prisma.challenge.count(),
  ]);

  console.log(
    `Before: ${users} visitors, ${attempts} attempts, ${submissions} answers, ${challenges} challenges.`
  );

  if (attempts === 0 && users === 0) {
    console.log("Nothing to clear. Leaderboard is already empty.");
    return;
  }

  // Order matters: submissions reference attempts, attempts reference users.
  await prisma.submission.deleteMany({});
  await prisma.attempt.deleteMany({});
  await prisma.user.deleteMany({});

  console.log(
    `After:  0 visitors, 0 attempts, 0 answers, ${await prisma.challenge.count()} challenges kept.`
  );
  console.log("Leaderboard cleared.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
