const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnostic() {
  console.log('--- Supabase Storage Diagnostic ---');
  console.log('URL:', process.env.SUPABASE_URL);
  
  // 1. Check if 'upload' bucket exists and is public
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.error('Error listing buckets:', bucketError.message);
    return;
  }
  
  const uploadBucket = buckets.find(b => b.name === 'upload');
  if (!uploadBucket) {
    console.error("Bucket 'upload' NOT FOUND. Please run 'node scripts/setup-storage.js'");
  } else {
    console.log(`Bucket 'upload' found. Public: ${uploadBucket.public}`);
  }
  
  // 2. List files in the bucket to see if anything is there
  const { data: files, error: listError } = await supabase.storage.from('upload').list('', { limit: 5 });
  if (listError) {
    console.error('Error listing files in "upload":', listError.message);
  } else {
    console.log(`Found ${files.length} files in 'upload' bucket.`);
    if (files.length > 0) {
      const firstFile = files[0].name;
      const { data: { publicUrl } } = supabase.storage.from('upload').getPublicUrl(firstFile);
      console.log(`Test Public URL: ${publicUrl}`);
      
      // 3. Optional: Try to fetch it with HTTPS to check CORS/Policy
      const https = require('https');
      https.get(publicUrl, (res) => {
        console.log(`HTTP Status for public access: ${res.statusCode}`);
        if (res.statusCode === 403 || res.statusCode === 401) {
          console.error('--- CRITICAL: Public Access Denied (403/401) ---');
          console.log('Your bucket is set to public, but you likely lack a SELECT policy on storage.objects.');
          console.log('Run this in your Supabase SQL Editor:');
          console.log("CREATE POLICY \"Public Access\" ON storage.objects FOR SELECT USING ( bucket_id = 'upload' );");
        } else if (res.statusCode === 200) {
          console.log('Public access is WORKING.');
        }
      }).on('error', (e) => {
        console.error('Fetch error:', e.message);
      });
    } else {
      console.log('No files to test public access. Please register a user first.');
    }
  }
}

diagnostic();
