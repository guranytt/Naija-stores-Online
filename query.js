import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qlavqcvsdeggafsrntff.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsYXZxY3ZzZGVnZ2Fmc3JudGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NjUyMTgsImV4cCI6MjA5NzI0MTIxOH0.gsPRdFPvCjuVo3wAb2qKJ8KjTMg7lKmToQ5RR5Z3uOg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkData() {
  const { data: cats, error: errC } = await supabase.from('categories').select('*');
  if (errC) console.error("Error cats:", errC);
  console.log('Categories:', cats?.map(c => ({id: c.id, name: c.name})));

  const { data: prods, error: errP } = await supabase.from('products').select('id, title, category, category_id, categories(id, name, slug)').limit(500);
  if (errP) console.error("Error prods:", errP);
  
  if (!prods) return;
  const beautyProds = prods.filter(p => JSON.stringify(p).toLowerCase().includes('beauty'));
  const phonesProds = prods.filter(p => JSON.stringify(p).toLowerCase().includes('phone'));
  const elecProds = prods.filter(p => JSON.stringify(p).toLowerCase().includes('electronic'));

  console.log('\nBeauty Products Sample:');
  console.log(beautyProds.slice(0, 2));

  console.log('\nPhones Products Sample:');
  console.log(phonesProds.slice(0, 2));

  console.log('\nElectronics Products Sample:');
  console.log(elecProds.slice(0, 2));
}

checkData();
