import * as emailService from './server/emailServices.js';
import fs from 'fs';
import path from 'path';

// Intercept sendBaseEmail basically
// Actually, emailService uses sendBaseEmail internally which we can't completely overwrite without proxy.
// Let's create an express server process? No, we can just edit server/emailServices.ts temporarily or just fetch the preview endpoint locally.
