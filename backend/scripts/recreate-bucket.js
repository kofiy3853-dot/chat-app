const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function recreate() {
  console.log('--- RECREATING "upload" BUCKET ---');
  
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets.find(b => b.name === 'upload')) {
    console.log('Deleting existing "upload" bucket...');
    const { error: deleteError } = await supabase.storage.deleteBucket('upload');
    if (deleteError) {
      console.error('Delete Failed:', deleteError.message);
      // Might fail if not empty, but we'll try anyway
    }
  }
  
  console.log('Creating "upload" bucket with broad mimetypes...');
  const { data, error: createError } = await supabase.storage.createBucket('upload', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf', 'application/octet-stream', 'text/plain']
  });
  
  if (createError) {
    console.error('Create Failed:', createError.message);
  } else {
    console.log('Bucket "upload" RECREATED successfully.');
  }
}

recreate();
