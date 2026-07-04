import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://qlavqcvsdeggafsrntff.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsYXZxY3ZzZGVnZ2Fmc3JudGZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY2NTIxOCwiZXhwIjoyMDk3MjQxMjE4fQ.NCtu4o6pl_-fs9zOitArCZDCzNOpb3JOChBfa75NQ0Y";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from("categories")
    .delete()
    .ilike("name", "%test product inserted directly%");
  
  console.log("Delete result categories:", data, error);

  const { data: data2, error: error2 } = await supabase
    .from("categories")
    .delete()
    .ilike("slug", "%test%");
    
  console.log("Delete result categories with test in slug:", data2, error2);

  const { data: data3, error: error3 } = await supabase
    .from("categories")
    .select("*");
  console.log("Remaining categories:", data3?.map(c => c.name));
}

run();
