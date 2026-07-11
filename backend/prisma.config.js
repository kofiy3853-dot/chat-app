import 'dotenv/config';
import { defineConfig } from '@prisma/config';

// For local dev, DATABASE_URL is 'file:./dev.db' (SQLite).
// For production, DATABASE_URL is a postgresql:// connection string.
// prisma db push at startup will use DATABASE_URL automatically from the schema.
export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
});
