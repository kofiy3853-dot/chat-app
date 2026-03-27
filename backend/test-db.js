const { Client } = require('pg');

async function test(url, name) {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log(`[SUCCESS] ${name}`);
    await client.end();
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

async function main() {
  const user = 'postgres.pkfysnbnfjjybxrsxsiu';
  const passes = ['CampusChat123!', 'CampusChatPassword123!', 'CampusChat123%21', 'CampusChatPassword123%21'];
  const host = 'aws-1-us-east-1.pooler.supabase.com';

  for (const pass of passes) {
    await test(`postgresql://${user}:${pass}@${host}:5432/postgres`, `Port 5432 - ${pass}`);
    await test(`postgresql://${user}:${pass}@${host}:6543/postgres`, `Port 6543 - ${pass}`);
  }
}

main();
