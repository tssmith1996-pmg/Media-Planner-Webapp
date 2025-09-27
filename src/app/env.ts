export const ENV = {
  mode: import.meta.env.MODE,
  auth:
    import.meta.env.VITE_AUTH_MODE === 'firebase'
      ? 'firebase'
      : import.meta.env.VITE_AUTH_MODE === 'mock'
        ? 'mock'
        : import.meta.env.MODE === 'production'
          ? 'firebase'
          : 'mock',
  storage:
    import.meta.env.VITE_USE_LOCAL_ONLY === 'true' || import.meta.env.MODE !== 'production'
      ? 'local'
      : 'firebase',
  defaultOrgId: import.meta.env.VITE_FIREBASE_DEFAULT_ORG_ID ?? 'demo-org',
  defaultWorkspaceId: import.meta.env.VITE_FIREBASE_DEFAULT_WORKSPACE_ID ?? 'demo-workspace',
} as const;

export type StorageMode = typeof ENV.storage;
export type AuthMode = typeof ENV.auth;
