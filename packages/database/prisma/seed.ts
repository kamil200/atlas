import "../src/load-env";

import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";
import { buildDataset } from "./seed/build-dataset";
import { createRng } from "./seed/rng";

/*
  Wipes the database and rebuilds it from the seeded generator.
  Run with `pnpm db:seed`.
*/

const DEMO_PASSWORD = "Password123!";

/* Order matters only for readability — CASCADE handles the dependencies. */
const TABLES = [
  "Application",
  "Resume",
  "CompanySubmission",
  "CompanyFounder",
  "CompanyInvestor",
  "Job",
  "Office",
  "Founder",
  "Investor",
  "Department",
  "Company",
  "User",
];

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV is production.");
  }

  const startedAt = Date.now();

  // Dates hang off the run time so the demo always shows recent postings.
  // Everything else — names, coordinates, salaries, counts — is fixed by the seed.
  const dataset = buildDataset(createRng(), startedAt);

  const passwordHash = await hash(DEMO_PASSWORD);
  for (const user of dataset.users) user.passwordHash = passwordHash;

  console.log("Clearing existing data...");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );

  console.log("Writing seed data...");
  await prisma.user.createMany({ data: dataset.users });
  await prisma.department.createMany({ data: dataset.departments });
  await prisma.investor.createMany({ data: dataset.investors });
  await prisma.company.createMany({ data: dataset.companies });
  await prisma.office.createMany({ data: dataset.offices });
  await prisma.founder.createMany({ data: dataset.founders });
  await prisma.companyFounder.createMany({ data: dataset.companyFounders });
  await prisma.companyInvestor.createMany({ data: dataset.companyInvestors });
  await prisma.job.createMany({ data: dataset.jobs });

  const openJobs = dataset.jobs.filter((j) => j.status === "OPEN").length;
  console.log(
    [
      "",
      `  companies        ${dataset.companies.length}`,
      `  offices          ${dataset.offices.length}`,
      `  jobs             ${dataset.jobs.length} (${openJobs} open)`,
      `  departments      ${dataset.departments.length}`,
      `  investors        ${dataset.investors.length}`,
      `  founders         ${dataset.founders.length}`,
      `  users            ${dataset.users.length}  (password: ${DEMO_PASSWORD})`,
      "",
      `  done in ${Date.now() - startedAt}ms`,
      "",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
