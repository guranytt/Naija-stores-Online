import fs from 'fs';
const file = 'supabase/functions/send-email-resend/templates.ts';
let data = fs.readFileSync(file, 'utf8');
data = data.replace(/\\`/g, '`');
data = data.replace(/\\\${/g, '${');
fs.writeFileSync(file, data);
console.log('Fixed templates.ts');
