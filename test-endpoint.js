import fetch from 'node-fetch';

async function test() {
  const payload = {
    id: "a3e87d40-1a1a-4b00-8c20-a00000000000",
    name: "Fashion",
    slug: "fashion",
    image_url: "",
    description: "test",
    icon_name: "test",
    item_count: 0,
    subcategories: [],
    default_commission_percentage: 5.0
  };
  const res = await fetch('http://localhost:3000/api/category/upsert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-mock-user-id': 'mock-user' },
    body: JSON.stringify(payload)
  });
  console.log(await res.text());
}
test();
