import 'dotenv/config';
import { defineConfig } from '@prisma/config';

// DIRECT_URL should be the Supabase SESSION pooler (port 5432) — supports DDL for migrations.
// DATABASE_URL should be the Supabase TRANSACTION pooler (port 6543) — used at runtime.
const migrationUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  datasource: {
    url: migrationUrl,
  },
});
