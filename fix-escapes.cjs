const fs = require('fs');
const path = 'supabase/functions/send-email-resend/index.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/\\`/g, '`').replace(/\\\${/g, '${');
fs.writeFileSync(path, content);
console.log('Fixed escaping in index.ts');
