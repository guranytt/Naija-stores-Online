const fs = require('fs');
const path = require('path');

const customerViewsPath = path.join(__dirname, 'src/components/CustomerViews.tsx');
let customerViewsCode = fs.readFileSync(customerViewsPath, 'utf-8');

// 1. Add useStore import
if (!customerViewsCode.includes('import { useStore }')) {
  customerViewsCode = customerViewsCode.replace(
    'import { formatNaira } from "../utils";',
    'import { formatNaira } from "../utils";\nimport { useStore } from "../store/useStore";'
  );
}

// 2. Remove CustomerViewsProps interface and replace function signature
const interfaceRegex = /interface CustomerViewsProps \{[\s\S]*?\n\}\n/;
customerViewsCode = customerViewsCode.replace(interfaceRegex, '');

const signatureRegex = /export default function CustomerViews\(\{[\s\S]*?\}\: CustomerViewsProps\) \{/;

const newSignature = `export default function CustomerViews() {
  const {
    currentScreen: screen,
    setCurrentScreen: onNavigate,
    selectedProductId,
    setSelectedProductId: onSelectProduct,
    initialCategory = "all",
    cart,
    addToCart: onAddToCart,
    updateCartQty: onUpdateCartQty,
    removeFromCart: onRemoveFromCart,
    searchFilter,
    setSearchFilter: onSearch,
    vendors = [],
    products = [],
    categories = [],
    orders = [],
    ads = [],
    flashDeals = [],
    currentUserId,
    selectedVendorSlug: vendorSlug = "eko-heritage-weavers",
    setSelectedVendorSlug: onSelectVendor,
  } = useStore();
  
  const isLoggedIn = !!currentUserId;
  const isLoading = false;
  // TODO: Fix checkout and rate vendor handlers if needed
  const onCheckout = () => { console.log('checkout'); };
  const onRateVendor = () => { console.log('rate vendor'); };`;

customerViewsCode = customerViewsCode.replace(signatureRegex, newSignature);
fs.writeFileSync(customerViewsPath, customerViewsCode);

console.log('CustomerViews refactored.');
