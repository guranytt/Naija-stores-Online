Fix a role-authorization gap in the Naija Online Stores codebase (React + Express + Supabase + Clerk).

BUG SUMMARY:
Any vendor (Supabase users.role = 'vendor') can reach the /admin screen and use the 
"Category & Subcategory Taxonomy Management" form in src/components/VendorAdmin.tsx, 
because that component accepts an `isAdmin` prop but never actually uses it to gate 
anything. When a non-admin vendor submits a category, it saves fine to localStorage, 
then POSTs to /api/category/upsert, which is wrapped in `requireAdmin` middleware in 
server.ts (only passes for role === 'admin' or an email in MASTER_ADMIN_EMAILS). The 
request gets a 403, saveSupabaseBatchRecords() in src/supabase.ts returns false, and 
the user sees a misleading toast: "⚠️ Category sync failed — changes are local only. 
Check admin permissions."

There's also a related bug: in src/App.tsx, the `isAdmin` state (inside the Clerk 
auth-sync useEffect around line ~505-508) is computed as:
    const isMasterAdmin = uEmail.toLowerCase() === "adminnaijastoresonline@gmail.com";
    setIsAdmin(isMasterAdmin);
This only checks ONE hardcoded email and ignores both `role === 'admin'` from the 
Supabase users table AND the second master admin email used elsewhere in the backend 
("mcgigimeshai@gmail.com", see MASTER_ADMIN_EMAILS in server.ts). This means even a 
legitimate role='admin' user or the second master admin can get isAdmin=false client-side.

FIX #1 — src/App.tsx
In the Clerk auth-sync useEffect, replace the isMasterAdmin/isAdmin logic so it matches 
the backend's real authorization rule. Define a shared constant (or inline array) of 
master admin emails: ["adminnaijastoresonline@gmail.com", "mcgigimeshai@gmail.com"] 
(lowercase-compare), and set:
    const isMasterAdmin = MASTER_ADMIN_EMAILS.includes(uEmail.toLowerCase());
    const trueIsAdmin = data?.role === "admin" || isMasterAdmin;
    setIsAdmin(trueIsAdmin);
Apply this in both the success branch (where `data.role` is available) and the fallback 
/ error branch (where only email-based check is possible).

FIX #2 — src/components/VendorAdmin.tsx
Actually use the `isAdmin` prop to gate the "Category & Subcategory Taxonomy Management" 
section (the block containing "CREATE PARENT CATEGORY", "ADD NESTED SUBCATEGORY", and 
the "+ Create Category" button/form, roughly lines 1690-1930+ — locate by searching for 
"CREATE PARENT CATEGORY" and "+ Create Category"). For non-admin vendors (isAdmin === false):
  - Do not render the create/edit/delete category form controls.
  - Instead render a read-only or disabled panel explaining "Category management is 
    restricted to marketplace administrators. Contact an admin to add or edit categories."
  - Keep this consistent with the app's existing design system (Tailwind classes already 
    used nearby) — don't introduce a new visual style.
Do NOT remove the isAdmin prop or its typing; just make it functional.

FIX #3 — src/supabase.ts (better error surfacing, optional but preferred)
In saveSupabaseBatchRecords(), when the fetch response is not ok, parse the JSON error 
body (already fetched via response.text() — adapt to also try response.json() first) and 
return a richer result instead of just `boolean`, e.g.:
    { success: boolean; status?: number; message?: string }
Update the return type and the one caller (handleUpdateCategories in src/App.tsx) to use 
this and show a more specific toast, e.g.:
  - status 401 → "You need to sign in again to save categories."
  - status 403 → "Only marketplace admins can save category changes — this change is local only."
  - anything else → keep the existing generic "sync error" toast with the message included.
Keep the localStorage-first-save behavior unchanged (offline-first UX must not regress).

CONSTRAINTS:
- Don't change the requireAdmin/requireVendor logic in server.ts — the backend gate is 
  correct and should stay the source of truth.
- Don't touch unrelated features (flash deals, mail logs, orders, vendor management).
- Preserve existing prop names/types where possible for backward compatibility with 
  other callers of VendorAdmin.
- After changes, run a TypeScript build check (tsc --noEmit or the project's existing 
  build script) to confirm no type errors were introduced.

Show me a diff/summary of every file changed before finishing.
