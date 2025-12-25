import { firebaseAuth } from "@/src/lib/firebase/client";
import {
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
  type User,
} from "firebase/auth";

const NICKNAME_KEY = "yty:nickname";

export function getStoredNickname(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NICKNAME_KEY);
}

export function storeNickname(nickname: string) {
  localStorage.setItem(NICKNAME_KEY, nickname);
}

export async function ensureSignedIn(): Promise<User> {
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  const cred = await signInAnonymously(firebaseAuth); // anonymous auth [web:883]
  return cred.user;
}

export async function setNickname(nickname: string): Promise<User> {
  const user = await ensureSignedIn();
  await updateProfile(user, { displayName: nickname }); // sets displayName [web:881]
  storeNickname(nickname);
  return firebaseAuth.currentUser ?? user;
}

export function subscribeAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(firebaseAuth, cb);
}
