import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) console.error(error);
  else if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    // If no data, let's insert a dummy row and then rollback, or use another way
    console.log("No data");
  }
}
run();
