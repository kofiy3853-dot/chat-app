const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUpload() {
  console.log('--- Testing File Upload ---');
  const fileName = `test-${Date.now()}.txt`;
  const { data, error } = await supabase.storage
    .from('upload')
    .upload(fileName, 'Hello world!', {
      contentType: 'text/plain',
      upsert: true
    });
    
  if (error) {
    console.error('Upload Failed:', error.message);
  } else {
    console.log('Upload Successful:', data.path);
    const { data: { publicUrl } } = supabase.storage.from('upload').getPublicUrl(data.path);
    console.log('Public URL:', publicUrl);
  }
}

testUpload();
