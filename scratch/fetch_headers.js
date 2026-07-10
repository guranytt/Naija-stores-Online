async function getHeaders() {
  try {
    const res = await fetch("https://ufndgfhttpbapctkfqab.supabase.co/rest/v1/", {
      method: "GET"
    });
    console.log("Status:", res.status);
    console.log("Headers:");
    for (const [key, val] of res.headers.entries()) {
      console.log(`- ${key}: ${val}`);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

getHeaders();
