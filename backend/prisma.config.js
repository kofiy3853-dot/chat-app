// Prisma 7 configuration file for CLI usage (Migrate, Pull, Studio)
// Connection details are moved here from schema.prisma.

module.exports = {
  db: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL
  }
};
