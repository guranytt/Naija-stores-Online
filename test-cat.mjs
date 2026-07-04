import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/categories');
    const getText = await res.text();
    console.log("Get response:", getText);
  } catch (err) {
    console.error(err);
  }
}

test();
