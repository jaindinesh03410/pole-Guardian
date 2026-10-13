import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore, isFirebaseConfigured } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { AppUser } from '@/types';

export function useAuth() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    console.log('🔐 useAuth: Setting up auth listener', { isFirebaseConfigured, hasAuth: !!auth });

    if (!isFirebaseConfigured || !auth) {
      console.log('⚠️ useAuth: Firebase not configured, setting user to null');
      setUser(null);
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser ? firebaseUser.email : 'null');

      if (!firebaseUser) {
        console.log('❌ No user logged in');
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('✅ User logged in:', firebaseUser.email, firebaseUser.uid);

      // Create app user with defaults (don't require Firestore document)
      const appUser: AppUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        displayName: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
        role: 'admin', // Default to admin for now
        assignedPoles: [],
      };

      // Try to fetch additional data from Firestore (optional)
      try {
        if (firestore) {
          const snap = await getDoc(doc(firestore, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            appUser.displayName = data.displayName ?? appUser.displayName;
            appUser.role = data.role ?? appUser.role;
            appUser.assignedPoles = data.assignedPoles ?? [];
            console.log('📄 Loaded user data from Firestore:', appUser);
          } else {
            console.log('ℹ️ No Firestore user document, using defaults');
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch Firestore user data:', error);
      }

      console.log('✅ Setting user in store:', appUser);
      setUser(appUser);
      setLoading(false);
    });
    return unsub;
  }, [setUser, setLoading]);
}
