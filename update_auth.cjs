const fs = require('fs');

// 1. Update UserAuthHub.tsx
const userAuthPath = 'c:/Users/ebongsworld/Downloads/naijastores-online (3)/src/components/UserAuthHub.tsx';
let userAuthCode = fs.readFileSync(userAuthPath, 'utf8');
userAuthCode = userAuthCode.replace(/emailRedirectTo:\s*window\.location\.origin\s*\+\s*"\?login=true"/g, 'emailRedirectTo: window.location.origin + "/auth"');
fs.writeFileSync(userAuthPath, userAuthCode);

// 2. Update VendorAuth.tsx
const vendorAuthPath = 'c:/Users/ebongsworld/Downloads/naijastores-online (3)/src/components/VendorAuth.tsx';
let vendorAuthCode = fs.readFileSync(vendorAuthPath, 'utf8');
vendorAuthCode = vendorAuthCode.replace(/emailRedirectTo:\s*window\.location\.origin\s*\+\s*"\?login=true"/g, 'emailRedirectTo: window.location.origin + "/auth"'); // Use /auth as per user request
fs.writeFileSync(vendorAuthPath, vendorAuthCode);

console.log('Successfully updated emailRedirectTo in Auth components.');
