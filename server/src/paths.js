// Absolute folder paths, resolved relative to this file so they work no matter
// which directory the server is started from.
import { fileURLToPath } from 'node:url';

// server/uploads: where card photos are saved.
export const UPLOAD_DIR = fileURLToPath(new URL('../uploads', import.meta.url));
// client/dist: the production build of the React app.
export const CLIENT_DIST = fileURLToPath(new URL('../../client/dist', import.meta.url));
