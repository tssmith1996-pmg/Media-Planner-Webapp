import { ENV } from '@/app/env';
import { LocalAdapter } from './localAdapter';
import { FirebaseAdapter } from './firebaseAdapter';
import type { Store } from './types';

export const store: Store = ((): Store => {
  if (ENV.storage === 'local') {
    return LocalAdapter();
  }
  return FirebaseAdapter();
})();
