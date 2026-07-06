const fs = require('fs');
let p = 'c:/Users/ebongsworld/Downloads/naijastores-online (3)/src/App.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /const VendorAdmin = lazy\(\(\) => import\("\.\/components\/VendorAdmin"\)\);/g,
  'const VendorShell = lazy(() => import("./components/vendor/VendorShell"));'
);

c = c.replace(/<VendorAdmin \/>/g, '<VendorShell />');

fs.writeFileSync(p, c);
