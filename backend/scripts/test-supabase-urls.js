const axios = require('axios');

async function testUrl(url) {
  try {
    const res = await axios.get(url);
    console.log(`URL: ${url} -> Status: ${res.status}`);
  } catch (err) {
    console.log(`URL: ${url} -> Status: ${err.response?.status || err.message}`);
  }
}

async function main() {
  const urls = [
    'https://pkfysnbnfjjybxrsxsiu.supabase.co/storage/v1/object/public/upload/1775207797584-ruxfsk.png',
    'https://pkfysnbnfjjybxrsxsiu.supabase.co/storage/v1/object/public/upload/1775207975847-ruxfsk.png'
  ];
  for (const url of urls) {
    await testUrl(url);
  }
}

main();
