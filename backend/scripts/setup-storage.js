const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  const BUCKET_NAME = 'upload';
  
  console.log(`Checking for bucket: ${BUCKET_NAME}...`);
  
  try {
    // 1. Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) throw listError;
    
    const bucketExists = buckets.find(b => b.name === BUCKET_NAME);
    
    if (bucketExists) {
      console.log(`Bucket "${BUCKET_NAME}" already exists.`);
    } else {
      console.log(`Creating bucket "${BUCKET_NAME}"...`);
      const { data, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf', 'application/octet-stream', 'text/plain', 'image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });
      
      if (createError) throw createError;
      console.log(`Successfully created bucket "${BUCKET_NAME}".`);
    }

    // 2. Ensure it is public (in case it existed but was private)
    console.log(`Ensuring bucket "${BUCKET_NAME}" is public...`);
    const { error: updateError } = await supabase.storage.updateBucket(BUCKET_NAME, {
      public: true
    });
    
    if (updateError) {
      console.warn(`Warning: Could not update bucket to public: ${updateError.message}`);
    } else {
      console.log(`Bucket "${BUCKET_NAME}" is now confirmed public.`);
    }

    console.log('\nStorage setup complete! 🚀');
  } catch (err) {
    console.error('Failed to setup storage:', err.message);
    process.exit(1);
  }
}

setupStorage();
