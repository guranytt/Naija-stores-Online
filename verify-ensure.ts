function ensureUUIDHighEntropy(idValue: any): string {
  if (!idValue) return "";
  const idStr = String(idValue).trim();
  const IS_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (IS_UUID_REGEX.test(idStr)) return idStr;
  
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  let h3 = 0x12345678;
  let h4 = 0x9abcdef0;
  
  for (let i = 0; i < idStr.length; i++) {
    const char = idStr.charCodeAt(i);
    h1 = Math.imul(h1 ^ char, 2654435761);
    h2 = Math.imul(h2 ^ char, 1597334677);
    h3 = Math.imul(h3 ^ char, 3812030037);
    h4 = Math.imul(h4 ^ char, 4294967291);
  }
  
  const toHex = (n: number) => {
    const u = n >>> 0;
    return u.toString(16).padStart(8, '0');
  };
  
  let hex = toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
  hex = hex.substring(0, 12) + "4" + hex.substring(13, 16) + "a" + hex.substring(17);
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}

const mockVendorIds = ["v_heritage", "v_alaba", "v_compvillage", "v_balogun", "v_sheabeauty", "v_snacks", "v_lekki", "v_yaba"];
const fallbackStr = "v_fallback_adminnaijastoresonline_gmail_com";

console.log(`${fallbackStr} -> ${ensureUUIDHighEntropy(fallbackStr)}`);
mockVendorIds.forEach(id => {
  console.log(`Mock ${id} -> ${ensureUUIDHighEntropy(id)}`);
});
