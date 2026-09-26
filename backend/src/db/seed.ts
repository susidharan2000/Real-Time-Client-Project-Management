import "dotenv/config";
import bcrypt from "bcrypt";
import { pool } from "./pool.js";

const accounts = [
  { username: "admin", email: "admin@example.test", role: "ADMIN" },
  { username: "pm1", email: "pm1@example.test", role: "PROJECT_MANAGER" },
  { username: "pm2", email: "pm2@example.test", role: "PROJECT_MANAGER" },
  { username: "dev1", email: "dev1@example.test", role: "DEVELOPER" },
  { username: "dev2", email: "dev2@example.test", role: "DEVELOPER" },
  { username: "dev3", email: "dev3@example.test", role: "DEVELOPER" },
  { username: "dev4", email: "dev4@example.test", role: "DEVELOPER" },
] as const;

async function seed() {
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword) {
    throw new Error("SEED_DEMO_PASSWORD is required");
  }

  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const role of ["ADMIN", "PROJECT_MANAGER", "DEVELOPER"]) {
      await client.query(
        `INSERT INTO roles (role_name)
         VALUES ($1)
         ON CONFLICT (role_name) DO NOTHING`,
        [role]
      );
    }

    for (const account of accounts) {
      await client.query(
        `INSERT INTO users (user_name, email, password_hash, role_id)
         SELECT $1, $2, $3, role_id
         FROM roles
         WHERE role_name = $4
         ON CONFLICT DO NOTHING`,
        [
          account.username,
          account.email,
          passwordHash,
          account.role,
        ]
      );
    }

    await client.query("COMMIT");
    console.log("Seeded roles and demo users");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });