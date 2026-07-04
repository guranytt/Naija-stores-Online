import fetch from "node-fetch";

async function main() {
  try {
    const res = await fetch("http://localhost:3000/api/categories");
    const json = await res.json();
    console.log(Object.keys(json.data[0]));
  } catch (err) {
    console.error(err);
  }
}

main();
