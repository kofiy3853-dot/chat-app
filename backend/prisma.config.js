import 'dotenv/config';
import { defineConfig } from '@prisma/config';

const dbUrl = process.env.DATABASE_URL;

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  datasource: {
    url: dbUrl,
  },
});
