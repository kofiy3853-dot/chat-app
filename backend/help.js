const { execSync } = require('child_process');
console.log(execSync('npx prisma migrate diff -h').toString());
