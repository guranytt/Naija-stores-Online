const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('products').insert({
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Product',
    slug: 'test-product-123',
    price: 1000,
    image_urls: JSON.stringify(['https://example.com/img.jpg'])
  });
  console.log('Error with stringify:', error);

  const { data: data2, error: error2 } = await supabase.from('products').insert({
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Product 2',
    slug: 'test-product-1234',
    price: 1000,
    image_urls: ['https://example.com/img.jpg']
  });
  console.log('Error with array:', error2);
}

test();
