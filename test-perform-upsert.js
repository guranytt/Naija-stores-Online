import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jmmfogjefenmjqspspyg.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbWZvZ2plZmVubWpxc3BzcHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjkwODEsImV4cCI6MjA5NjI0NTA4MX0.ah-wpbhIJKcF9fs4UVpXCAVwq5Bw10aTNPdtJxyPg3M";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function ensureUUID(idValue) {
  if (!idValue) return "";
  const idStr = String(idValue).trim();
  const IS_UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (IS_UUID_REGEX.test(idStr)) return idStr;
  
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i);
    hash |= 0;
  }
  let hex = "";
  for (let i = 0; i < 32; i++) {
    const code = Math.abs(hash + i * 2654435761) % 16;
    hex += code.toString(16);
  }
  return `${hex.substring(0,8)}-${hex.substring(8,12)}-4${hex.substring(13,16)}-a${hex.substring(17,20)}-${hex.substring(20,32)}`;
}

async function run() {
  const fallbackId = "v_fallback_adminnaijastoresonline_gmail_com";
  const compliantId = ensureUUID(fallbackId);
  console.log("Hashed UUID for fallback ID:", compliantId);

  // Grab the db columns
  let dbColumns = ['id', 'user_id', 'business_name', 'owner_name', 'business_description', 'logo_url', 'approval_status', 'phone', 'email', 'created_at'];
  try {
    const { data: colsSample, error: colsErr } = await supabaseAdmin.from("vendors").select("*").limit(1);
    if (!colsErr && colsSample && colsSample.length > 0) {
      dbColumns = Object.keys(colsSample[0]);
    }
  } catch (colErr) {
    console.warn("Error getting cols:", colErr);
  }

  const payload = {
    id: compliantId,
    email: "adminnaijastoresonline@gmail.com",
    name: "Balogun Trendsetters Test",
    ownerName: "Alimi Oladipupo",
    location: "Balogun Market, Lagos",
    avatar: "https://images.unsplash.com/photo-1542838132-92c53300491e",
    cacNumber: "RC 1234567",
    whatsappNumber: "+23481234567",
    bankName: "Access Bank",
    accountNumber: "1234567890",
    business_description: "Test brand statement"
  };

  const extraMetadata = {
    bank_name: payload.bank_name || payload.bankName || "",
    account_number: payload.account_number || payload.accountNumber || "",
    cac_number: payload.cac_number || payload.cacNumber || "",
    whatsapp_number: payload.whatsapp_number || payload.whatsappNumber || "",
    physical_location: payload.physical_location || payload.physicalLocation || payload.location || "",
    is_verified: false,
    business_description: payload.business_description || payload.description || ""
  };

  const finalPayload = {};
  finalPayload.business_description = JSON.stringify(extraMetadata);

  const coreKeys = ['id', 'user_id', 'business_name', 'owner_name', 'logo_url', 'approval_status', 'phone', 'email', 'created_at'];
  coreKeys.forEach((key) => {
    if (dbColumns.includes(key)) {
      if (key === 'business_name') finalPayload[key] = payload.name;
      else if (key === 'owner_name') finalPayload[key] = payload.ownerName;
      else if (key === 'logo_url') finalPayload[key] = payload.avatar;
      else if (payload[key] !== undefined) finalPayload[key] = payload[key];
    }
  });

  const extraKeysMap = {
    'bank_name': 'bank_name',
    'account_number': 'account_number',
    'cac_number': 'cac_number',
    'whatsapp_number': 'whatsapp_number',
    'physical_location': 'physical_location',
    'is_verified': 'is_verified'
  };

  Object.entries(extraKeysMap).forEach(([dbCol, metaKey]) => {
    if (dbColumns.includes(dbCol)) {
      finalPayload[dbCol] = extraMetadata[metaKey];
    }
  });

  console.log("Upserting with payload:", JSON.stringify(finalPayload, null, 2));

  const { data, error } = await supabaseAdmin.from("vendors").upsert(finalPayload).select();
  if (error) {
    console.error("Upsert failed with error:", error);
  } else {
    console.log("Upsert succeeded! Returned data:\n", JSON.stringify(data, null, 2));
  }
}

run();
