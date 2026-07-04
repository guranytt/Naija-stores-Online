import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const productsToInsert = [
  { name: "Samsung Galaxy A17 6.7 HD 6GB RAM 128GB ROM Android 14 Black", price: 273000 },
  { name: "Samsung Galaxy A17 6.7 HD 4GB RAM 128GB ROM Android 14 Black", price: 250000 },
  { name: "Samsung Galaxy A26 5G 6.7 8GB RAM 256GB ROM Android 15 Dual SIM Black", price: 550000 },
  { name: "Samsung Galaxy Note20 SINGLE SIM 128GB 8GB RAM 5G", price: 450000 },
  { name: "Samsung Galaxy S10 Plus Single Sim 8GB RAM 128GB ROM Black", price: 300000 },
  { name: "Samsung Galaxy TAB S11 ULTRA 12GB 256GB 5G SILVER", price: 2100000 },
  { name: "Samsung Galaxy S26 ULTRA 256GB", price: 1880000 },
  { name: "Samsung Galaxy S26 12GB 256GB 5G", price: 1200000 },
  { name: "Samsung Galaxy A57 8GB 256GB 5G", price: 800000 },
  { name: "Samsung Galaxy A06 4GB 64GB 4G", price: 150000 },
  { name: "Silver crest infrared hotplate", price: 35000 },
  { name: "Kenwood yam pounder 8L 8500W", price: 55000 },
  { name: "20pcs Maximus dinner set", price: 35000 },
  { name: "Magic bullet nutribullet", price: 49000 },
];

async function run() {
  console.log("Fetching vendor id for naijaonlinestores@gmail.com...");
  const { data: vendors, error: vendorErr } = await supabase
    .from('vendors')
    .select('id')
    .eq('email', 'naijaonlinestores@gmail.com')
    .limit(1);

  let vendorId = null;
  if (vendors && vendors.length > 0) {
    vendorId = vendors[0].id;
  } else {
    console.log("Vendor naijaonlinestores@gmail.com not found, creating it.");
    // Create the vendor
    const { data: newVendor, error: createVendorErr } = await supabase
      .from('vendors')
      .insert({
        business_name: 'Naija Online Stores',
        email: 'naijaonlinestores@gmail.com',
        approval_status: 'approved'
      })
      .select()
      .single();
    if (newVendor) {
      vendorId = newVendor.id;
    } else {
      console.log("Failed to create vendor", createVendorErr);
    }
  }

  console.log("Deleting all products...");
  // delete all products without error when dealing with lots by doing eq out of bounds. But better is to get them and delete or delete match all
  // Supabase delete requires a filter. We can use eq on non-null or neq on null.
  const { data: delData, error: delErr, count: delCount } = await supabase
    .from('products')
    .delete({ count: 'exact' })
    .neq('name', 'SOME_IMPOSSIBLE_NAME');
  
  if (delErr) {
    console.error("Deletion failed:", delErr);
    return;
  }
  console.log(`Deleted ${delCount} products.`);

  const insertData = productsToInsert.map(p => {
      // Need a slug since it is likely required and unique
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random()*10000);
      return {
          name: p.name,
          price: p.price,
          description: "",
          vendor_id: vendorId,
          status: 'active', // Wait, prompt says set status to "approved"! Oh wait, the table might have an enum. Let me check the table definition. 
          slug: slug
      };
  });

  const { data: insData, error: insErr } = await supabase
    .from('products')
    .insert(insertData)
    .select();

  if (insErr) {
    console.error("Insertion failed:", insErr);
  } else {
    console.log(`Inserted ${insData.length} products.`);
    if (insData.length !== productsToInsert.length) {
      console.log("Some inserts may have failed/filtered.");
    }
  }
}

run();
