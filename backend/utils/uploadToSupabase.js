const supabase = require('./supabaseClient');
const fs = require('fs');
const path = require('path');

async function uploadToSupabase(file, bucket = 'upload') {
  console.log('[UPLOAD] Starting upload to bucket:', bucket);
  
  if (!supabase) {
    console.error('[UPLOAD] ERROR: Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    return null;
  }

  try {
    let fileContent;
    let fileName = file.originalname;

    if (file.buffer) {
      fileContent = file.buffer;
    } else if (file.path) {
      fileContent = fs.readFileSync(file.path);
    } else {
      throw new Error('No file content found to upload');
    }

    const fileExt = path.extname(fileName);
    const fileNameOnSupabase = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;
    const filePath = `${fileNameOnSupabase}`;

    console.log('[UPLOAD] File:', fileName, 'Size:', fileContent.length, 'Type:', file.mimetype);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileContent, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[UPLOAD] Supabase error:', error.message, error);
      throw error;
    }
    
    console.log('[UPLOAD] Uploaded, getting public URL...');

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl;
    console.log('[UPLOAD] Success! URL:', publicUrl?.substring(0, 50) + '...');
    
    return publicUrl;
  } catch (err) {
    console.error('[UPLOAD] FAILED:', err.message);
    if (err.message.includes('row')) {
      console.error('[UPLOAD] Bucket may not exist or RLS policy blocking. Run: node scripts/setup-storage.js');
    }
    return null;
  }
}

module.exports = uploadToSupabase;
