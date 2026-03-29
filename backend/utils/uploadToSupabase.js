const supabase = require('./supabaseClient');
const fs = require('fs');
const path = require('path');

const uploadToSupabase = async (fileObject, bucketName = 'chat-attachments') => {
  if (!supabase) {
    console.error('Supabase client not initialized. Cannot upload to cloud storage.');
    return null;
  }

  try {
    // Read file from disk (since multer is currently using diskStorage)
    const fileBuffer = fs.readFileSync(fileObject.path);
    const fileName = fileObject.filename;
    const contentType = fileObject.mimetype;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(`public/${fileName}`, fileBuffer, {
        contentType,
        upsert: true
      });

    if (error) {
       console.error('Supabase upload error:', error);
       return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(`public/${fileName}`);

    return publicUrl;
  } catch (err) {
    console.error('Failed to upload to Supabase:', err);
    return null;
  }
};

module.exports = uploadToSupabase;
