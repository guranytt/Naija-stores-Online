const fs = require('fs');
let c = fs.readFileSync('server/emailServices.ts', 'utf8');
c = c.replace(/\\\`/g, '`').replace(/\\\${/g, '${');
fs.writeFileSync('server/emailServices.ts', c);
