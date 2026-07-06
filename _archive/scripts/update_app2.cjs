const fs = require('fs');
let p = 'c:/Users/ebongsworld/Downloads/naijastores-online (3)/src/App.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/<ErrorBoundary>[\s\S]*?<VendorAdmin[\s\S]*?\/>[\s\S]*?<\/ErrorBoundary>/g, '<ErrorBoundary>\n                    <VendorShell />\n                  </ErrorBoundary>');

fs.writeFileSync(p, c);
