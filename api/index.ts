import appHandler from '../server';

export default async function handler(req: any, res: any) {
  // Pass the request to our configured Express app
  return appHandler(req, res);
}
