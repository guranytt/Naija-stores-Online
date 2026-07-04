import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = "https://qlavqcvsdeggafsrntff.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsYXZxY3ZzZGVnZ2Fmc3JudGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NjUyMTgsImV4cCI6MjA5NzI0MTIxOH0.gsPRdFPvCjuVo3wAb2qKJ8KjTMg7lKmToQ5RR5Z3uOg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from("categories").select("*").limit(1);
  console.log("Data:", data);
  console.log("Error:", error);
}
run();
