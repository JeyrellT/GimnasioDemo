import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const exercises = await prisma.exercise.findMany({
    where: {
      slug: {
        in: [
          "barbell-back-squat",
          "front-squat",
          "conventional-deadlift",
          "romanian-deadlift",
          "barbell-lunge",
          "leg-press",
        ],
      },
    },
    select: {
      slug: true,
      mediaUrl: true,
      gifUrl: true,
      thumbnailUrl: true,
    },
  });

  console.log(JSON.stringify(exercises, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
