const fs = require('fs');
const path = require('path');

const vendorAdminPath = path.join(__dirname, 'src/components/VendorAdmin.tsx');
let code = fs.readFileSync(vendorAdminPath, 'utf-8');

// Add useStore import if missing
if (!code.includes('import { useStore }')) {
  code = code.replace(
    'import { formatNaira } from "../utils";',
    'import { formatNaira } from "../utils";\nimport { useStore } from "../store/useStore";'
  );
}

// Remove the interface
const interfaceRegex = /interface VendorAdminProps \{[\s\S]*?\n\}\n/;
code = code.replace(interfaceRegex, '');

// Replace signature
const signatureRegex = /export default function VendorAdmin\(\{[\s\S]*?\}\: VendorAdminProps\) \{/;

const newSignature = `export default function VendorAdmin() {
  const {
    orders = [],
    products = [],
    vendors = [],
    userEmail = "adminnaijastoresonline@gmail.com",
    userBankName = "",
    userBankAccountNumber = "",
    userCacNumber = "",
    userStoreName = "",
    userOwnerName = "",
    userAvatar = "",
    userWhatsappNumber = "",
    userLocation = "",
    currentUserId = null,
    categories = [],
    ads = [],
    deliveryZones = [],
    flashDeals = [],
  } = useStore();

  // Handlers that used to be passed down - stubbed or simplified for local component logic
  // These will be fully replaced when we move Supabase logic out of App.tsx
  const onReviewOrderFlag = () => {};
  const onPromptReceipt = () => {};
  const onAddNewProduct = () => {};
  const onUpdateProduct = () => {};
  const onDeleteProduct = () => {};
  const onUpdateVendor = () => {};
  const onUpdateCategories = () => {};
  const onUpdateAds = () => {};
  const onUpdateDeliveryZones = () => {};
  const onProposeFlashDeal = () => {};
  const onApproveFlashDeal = () => {};
  const onRejectFlashDeal = () => {};
  const onRefreshMailLogs = () => {};
`;

code = code.replace(signatureRegex, newSignature);
fs.writeFileSync(vendorAdminPath, code);

console.log('VendorAdmin refactored.');
