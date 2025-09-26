export const ENV = {
  mode: import.meta.env.MODE,
  storage:
    import.meta.env.VITE_USE_LOCAL_ONLY === 'true' || import.meta.env.MODE !== 'production'
      ? 'local'
      : 'firebase',
} as const;

export type StorageMode = typeof ENV.storage;
