import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/**
 * Server-only Firebase Admin.
 * We will provide FIREBASE_ADMIN credentials via env vars next.
 */
export function getAdminApp(): App {
  if (getApps().length) return getApps()[0]!;

  const projectId = requireEnv("FIREBASE_ADMIN_PROJECT_ID");
  const clientEmail = requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
  const privateKey = requireEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
