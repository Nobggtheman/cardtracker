import { fileURLToPath } from 'node:url';

export const UPLOAD_DIR = fileURLToPath(new URL('../uploads', import.meta.url));
export const CLIENT_DIST = fileURLToPath(new URL('../../client/dist', import.meta.url));
