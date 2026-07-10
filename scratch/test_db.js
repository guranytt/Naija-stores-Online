import pkg from 'pg';
const { Client } = pkg;

const allRegions = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ca-central-1", "ca-west-1",
  "eu-central-1", "eu-central-2", "eu-west-1", "eu-west-2", "eu-west-3", "eu-south-1", "eu-south-2", "eu-north-1",
  "ap-northeast-1", "ap-northeast-2", "ap-northeast-3",
  "ap-southeast-1", "ap-southeast-2", "ap-southeast-3", "ap-southeast-4",
  "ap-south-1", "ap-south-2", "ap-east-1",
  "sa-east-1", "me-central-1", "me-south-1", "af-south-1"
];

async function scanRegion(region, password) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const user = "postgres.ufndgfhttpbapctkfqab";
  const encodedPassword = encodeURIComponent(password);
  const connectionString = `postgresql://${user}:${encodedPassword}@${host}:6543/postgres?pgbouncer=true`;

  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000
  });

  try {
    await client.connect();
    await client.end();
    return { status: "SUCCESS", message: "Connected successfully!" };
  } catch (err) {
    return { status: "FAILED", message: err.message };
  }
}

async function run() {
  const password = "[Admin@naijastoresonline2026]";

  console.log(`\n=== Scanning all regions (not stopping on timeouts) ===`);
  for (const region of allRegions) {
    const result = await scanRegion(region, password);
    if (result.status === "SUCCESS") {
      console.log(`\n🎉 SUCCESS! Connected in region: ${region}`);
    } else if (!result.message.includes("tenant/user") && !result.message.includes("ENOTFOUND")) {
      console.log(`\n📍 POTENTIAL REGION: ${region} -> Error: ${result.message}`);
    } else {
      process.stdout.write("."); // Print dot to show progress
    }
  }
  console.log("\nScan complete.");
}

run();
