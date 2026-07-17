import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: vendorData, error: vErr } = await supabaseAdmin.from('vendors').select('id').limit(1);
  if (vErr || !vendorData || vendorData.length === 0) {
    console.log("No vendor found", vErr);
    return;
  }
  const vendorId = vendorData[0].id;

  const { data: catData, error: cErr } = await supabaseAdmin.from('categories').select('id').limit(1);
  if (cErr || !catData || catData.length === 0) {
    console.log("No category found", cErr);
    return;
  }
  const catId = catData[0].id;

  const payload = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    vendor_id: vendorId,
    category_id: catId,
    name: 'Test Product Backend 2',
    description: 'Test description',
    price: 1000,
    stock_quantity: 10,
    image_urls: ['https://example.com/img.jpg'],
    status: 'active',
    slug: 'test-product-backend-2'
  };

  const { data, error } = await supabaseAdmin.from('products').insert(payload);
  console.log("Insert result:", { data, error });
}

test();
