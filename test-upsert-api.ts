import fetch from "node-fetch";

async function main() {
  const payloads = [
    {
      "id": "8d0264f2-f3a8-4b9d-b18d-0cc054b11f0a",
      "name": "Equipment and Machinery 2",
      "slug": "equipment-and-machinery-2",
      "image_url": "",
      "description": "Test description",
      "icon_name": "Package",
      "item_count": 0,
      "subcategories": [],
      "status": "active",
      "sort_order": 0,
      "default_commission_percentage": 5
    }
  ];

  try {
    const res = await fetch("http://localhost:3000/api/category/upsert", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-mock-user-id": "mock-user",
      },
      body: JSON.stringify(payloads)
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error(err);
  }
}

main();
