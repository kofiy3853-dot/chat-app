const supabase = require('./supabaseClient');
const fs = require('fs');
const path = require('path');

async function uploadToSupabase(file, bucket = 'chat-attachments') {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const path = require('path');
    const fs = require('fs');

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Support both disk and memory storage
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

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileContent, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error('Supabase Upload Error:', err);
    return null;
  }
}

module.exports = uploadToSupabase;
