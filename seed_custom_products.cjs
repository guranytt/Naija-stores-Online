require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  try {
    // 1. Get vendor ID
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('email', 'naijaonlinestores@gmail.com')
      .single();
      
    if (vendorError) {
      console.error('Error fetching vendor:', vendorError);
      return;
    }
    const vendorId = vendorData.id;
    console.log('Vendor ID found:', vendorId);

    // 2. Clear existing products
    const { data: allProds, error: pError } = await supabase
      .from('products')
      .select('id');
      
    let deletedCount = 0;
    if (allProds && allProds.length > 0) {
      const { data: delData, error: delError } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // match all
      if (delError) {
        console.error('Error deleting products:', delError);
      } else {
        deletedCount = allProds.length;
        console.log('Deleted rows:', deletedCount);
      }
    } else {
      console.log('No existing products to delete.');
    }

    // 3. Insert new products
    const productsToInsert = [
      { name: 'Samsung Galaxy A17 6.7 HD 6GB RAM 128GB ROM Android 14 Black', price: 273000 },
      { name: 'Samsung Galaxy A17 6.7 HD 4GB RAM 128GB ROM Android 14 Black', price: 250000 },
      { name: 'Samsung Galaxy A26 5G 6.7 8GB RAM 256GB ROM Android 15 Dual SIM Black', price: 550000 },
      { name: 'Samsung Galaxy Note20 SINGLE SIM 128GB 8GB RAM 5G', price: 450000 },
      { name: 'Samsung Galaxy S10 Plus Single Sim 8GB RAM 128GB ROM Black', price: 300000 },
      { name: 'Samsung Galaxy TAB S11 ULTRA 12GB 256GB 5G SILVER', price: 2100000 },
      { name: 'Samsung Galaxy S26 ULTRA 256GB', price: 1880000 },
      { name: 'Samsung Galaxy S26 12GB 256GB 5G', price: 1200000 },
      { name: 'Samsung Galaxy A57 8GB 256GB 5G', price: 800000 },
      { name: 'Samsung Galaxy A06 4GB 64GB 4G', price: 150000 },
      { name: 'Silver crest infrared hotplate', price: 35000 },
      { name: 'Kenwood yam pounder 8L 8500W', price: 55000 },
      { name: '20pcs Maximus dinner set', price: 35000 },
      { name: 'Magic bullet nutribullet', price: 49000 },
    ].map(p => {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      return {
        name: p.name,
        slug: slug,
        price: p.price,
        description: '',
        vendor_id: vendorId,
        status: 'active'
      };
    });

    const { data: insertedData, error: insError } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select();

    if (insError) {
      console.error('Error inserting products:', insError);
      console.error(JSON.stringify(insError, null, 2));
    } else {
      console.log('Inserted rows:', insertedData.length);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
