import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const fixes = [
    {
      brokenId: "photo-1556909114-44e3e9399c2b",
      replacement:
        "https://images.unsplash.com/photo-1556909190-eccf4a8bf97a?auto=format&fit=crop&w=1200&q=80",
    },
    {
      brokenId: "photo-1609592424823-3d6e3a0f3f02",
      replacement:
        "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=1200&q=80",
    },
  ];
  let total = 0;
  for (const f of fixes) {
    const r = await prisma.productImage.updateMany({
      where: { url: { contains: f.brokenId } },
      data: { url: f.replacement },
    });
    console.log(`  ${f.brokenId} -> patched ${r.count}`);
    total += r.count;
  }
  console.log(`✅ Patched ${total} product image rows.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exitCode = 1;
});
