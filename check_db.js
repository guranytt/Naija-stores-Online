import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qlavqcvsdeggafsrntff.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsYXZxY3ZzZGVnZ2Fmc3JudGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NjUyMTgsImV4cCI6MjA5NzI0MTIxOH0.gsPRdFPvCjuVo3wAb2qKJ8KjTMg7lKmToQ5RR5Z3uOg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log("Testing Supabase Connection...");
  console.log("URL:", SUPABASE_URL);

  const { data, error, count } = await supabase
    .from("products")
    .select("id", { count: 'exact' });

  if (error) {
    console.error("Database connection failed or query error:", error.message, error);
  } else {
    console.log("Connection successful!");
    console.log(`The 'public.products' table has ${count} records.`);
    if (data && data.length > 0) {
      console.log("Sample records:", data.slice(0, 3));
    } else {
      console.log("The 'public.products' table is currently EMPTY.");
    }
  }
}

testConnection();
