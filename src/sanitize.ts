import xss from 'xss';

export const sanitizeString = (str: string): string => {
  if (!str) return str;
  return xss(str).trim();
};

export const sanitizeFields = <T extends Record<string, any>>(obj: T): T => {
  const sanitized: any = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeString(obj[key] as string);
    } else {
      sanitized[key] = obj[key];
    }
  }
  return sanitized as T;
};
