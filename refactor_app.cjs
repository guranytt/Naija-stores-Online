const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src/App.tsx');
let code = fs.readFileSync(appPath, 'utf-8');

// Add import if missing
if (!code.includes('import { useStore }')) {
  code = code.replace(
    'import { formatNaira } from "./utils";',
    'import { formatNaira } from "./utils";\nimport { useStore } from "./store/useStore";'
  );
}

// Prepare the replacement hook
const hookDestructure = `
  const {
    currentScreen, setCurrentScreen,
    selectedProductId, setSelectedProductId,
    selectedVendorSlug, setSelectedVendorSlug,
    initialCategory, setInitialCategory,
    searchFilter, setSearchFilter,
    isCheckoutOpen, setIsCheckoutOpen,
    settingsDrawerOpen, setSettingsDrawerOpen,
    
    currentUserId, setCurrentUserId,
    userEmail, setUserEmail,
    vendorAuthenticated, setVendorAuthenticated,
    authReady, setAuthReady,
    
    products, setProducts,
    vendors, setVendors,
    categories, setCategories,
    orders, setOrders,
    ads, setAds,
    flashDeals, setFlashDeals,
    deliveryZones, setDeliveryZones,
    
    cart, setCart,
    addToCart: handleAddToCart,
    updateCartQty: handleUpdateCartQty,
    removeFromCart: handleRemoveFromCart,
    clearCart,
    checkoutAmount, setCheckoutAmount,
    
    userBankName, setUserBankName,
    userBankAccountNumber, setUserBankAccountNumber,
    userCacNumber, setUserCacNumber,
    userStoreName, setUserStoreName,
    userOwnerName, setUserOwnerName,
    userAvatar, setUserAvatar,
    userWhatsappNumber, setUserWhatsappNumber,
    userLocation, setUserLocation
  } = useStore();
`;

// Insert the hook right after `export default function App() {`
if (!code.includes('const { currentScreen, setCurrentScreen,')) {
  code = code.replace(/export default function App\(\) \{\n/, 'export default function App() {\n' + hookDestructure);
}

const toRemove = [
  /const \[currentScreen, setCurrentScreen\] = useState<string>\("home"\);/g,
  /const \[selectedProductId, setSelectedProductId\] = useState<string>\("p1"\);/g,
  /const \[selectedVendorSlug, setSelectedVendorSlug\] = useState<string>\("eko-heritage-weavers"\);/g,
  /const \[initialCategory, setInitialCategory\] = useState<string>\("all"\);/g,
  /const \[searchFilter, setSearchFilter\] = useState<string>\(""\);/g,
  /const \[isCheckoutOpen, setIsCheckoutOpen\] = useState<boolean>\(false\);/g,
  /const \[settingsDrawerOpen, setSettingsDrawerOpen\] = useState<boolean>\(false\);/g,
  /const \[currentUserId, setCurrentUserId\] = useState<string \| null>\(null\);/g,
  /const \[userEmail, setUserEmail\] = useState<string>\("adminnaijastoresonline@gmail.com"\);/g,
  /const \[vendorAuthenticated, setVendorAuthenticated\] = useState<boolean>\(false\);/g,
  /const \[authReady, setAuthReady\] = useState<boolean>\(false\);/g,
  /const \[userBankName, setUserBankName\] = useState<string>\(""\);/g,
  /const \[userBankAccountNumber, setUserBankAccountNumber\] = useState<string>\(""\);/g,
  /const \[userCacNumber, setUserCacNumber\] = useState<string>\(""\);/g,
  /const \[userStoreName, setUserStoreName\] = useState<string>\(""\);/g,
  /const \[userOwnerName, setUserOwnerName\] = useState<string>\(""\);/g,
  /const \[userAvatar, setUserAvatar\] = useState<string>\(""\);/g,
  /const \[userWhatsappNumber, setUserWhatsappNumber\] = useState<string>\(""\);/g,
  /const \[userLocation, setUserLocation\] = useState<string>\(""\);/g,
];

toRemove.forEach(regex => {
  code = code.replace(regex, '// replaced by useStore');
});

const complexStates = [
  { start: 'const [cart, setCart] = useState<CartItem[]>', end: '}, [cart]);' },
  { start: 'const [products, setProducts] = useState<Product[]>', end: '}, [products]);' },
  { start: 'const [orders, setOrders] = useState<Order[]>', end: '}, [orders]);' },
  { start: 'const [vendors, setVendors] = useState<Vendor[]>', end: '}, [vendors]);' },
  { start: 'const [ads, setAds] = useState<Advertisement[]>', end: '};' },
  { start: 'const [deliveryZones, setDeliveryZones] = useState<any[]>', end: '};' },
  { start: 'const [categories, setCategories] = useState<Category[]>', end: 'return [];\n  });' },
  { start: 'const [flashDeals, setFlashDeals] = useState<FlashDealProposal[]>', end: 'localStorage.setItem("NAIJA_FLASH_DEALS_PROPOSALS", JSON.stringify(updated));\n      });\n    };' },
];

complexStates.forEach(({start, end}) => {
  const startIndex = code.indexOf(start);
  if (startIndex !== -1) {
    const endIndex = code.indexOf(end, startIndex) + end.length;
    code = code.substring(0, startIndex) + '// complex state replaced by useStore\n' + code.substring(endIndex);
  }
});

// Remove cart handlers because they are now in useStore
code = code.replace(/const handleAddToCart = \([\s\S]*?\} else \{\n\s*setCart\(\[\.\.\.cart, \{ product, quantity, selectedSize: size, selectedColor: color \}\]\);\n\s*\}\n\s*\};\n/, '');
code = code.replace(/const handleUpdateCartQty = \([\s\S]*?\}\);\n\s*\};\n/, '');
code = code.replace(/const handleRemoveFromCart = \([\s\S]*?\}\);\n\s*triggerToast\("Removed item from cart.", "info"\);\n\s*\};\n/, '');

// Replace prop drilling on components
// CustomerViews
code = code.replace(/<CustomerViews[\s\S]*?isLoading=\{dbSyncStatus\.loading\}\n\s*\/>/, '<CustomerViews />');
// VendorAdmin
code = code.replace(/<VendorAdmin[\s\S]*?onRefreshMailLogs=\{fetchEmailLogs\}\n\s*\/>/, '<VendorAdmin />');

fs.writeFileSync(appPath, code);
console.log('App.tsx refactored.');
