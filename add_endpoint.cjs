const fs = require('fs');

let p = 'c:/Users/ebongsworld/Downloads/naijastores-online (3)/server.ts';
let c = fs.readFileSync(p, 'utf8');

const endpoint = `
import tinify from 'tinify';
tinify.key = process.env.TINIFY_API_KEY || 'ByhSRqcZwPMjf220YhXNCglgkLRyySjs';
import { v2 as cloudinary } from 'cloudinary';

app.post('/api/cloudinary/upload', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ success: false, error: 'No image provided' });
    
    // 1. Convert base64 to buffer
    const base64Data = image.replace(/^data:image\\/\\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 2. Compress and convert to webp using Tinify
    const source = tinify.fromBuffer(buffer);
    const converted = source.convert({type: ['image/webp']});
    const optimizedBuffer = await converted.toBuffer();
    
    // 3. Upload to Cloudinary via stream
    const uploadStream = cloudinary.uploader.upload_stream({ resource_type: 'image', format: 'webp' }, (error, result) => {
      if (error) {
        console.error('Cloudinary upload error:', error);
        return res.status(500).json({ success: false, error: 'Upload failed' });
      }
      if (result) {
        res.json({ success: true, url: result.secure_url, format: result.format, bytes: result.bytes });
      }
    });
    
    uploadStream.end(optimizedBuffer);

  } catch (error) {
    console.error('Image optimization/upload error:', error);
    res.status(500).json({ success: false, error: 'Optimization failed' });
  }
});
`;

if (!c.includes('/api/cloudinary/upload')) {
  // Insert before send-welcome-email
  c = c.replace(/app\.post\("\\/api\\/send-welcome-email"/, endpoint + '\n  app.post("/api/send-welcome-email"');
  fs.writeFileSync(p, c);
  console.log('Added Cloudinary + Tinify endpoint');
} else {
  console.log('Endpoint already exists');
}
