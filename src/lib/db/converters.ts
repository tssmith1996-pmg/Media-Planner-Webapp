import type { DocumentData, FirestoreDataConverter } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import type { z } from 'zod';

function normalize(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, normalize(v)]));
  }
  return value;
}

function denormalize(value: unknown): unknown {
  if (typeof value === 'string') {
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:.+/.test(value)) {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return Timestamp.fromDate(new Date(parsed));
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(denormalize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, denormalize(v)]));
  }
  return value;
}

export function createConverter<T extends z.ZodTypeAny>(schema: T): FirestoreDataConverter<z.infer<T>> {
  return {
    toFirestore(data) {
      const parsed = schema.parse(data);
      return denormalize(parsed) as DocumentData;
    },
    fromFirestore(snapshot) {
      const raw = snapshot.data();
      const normalized = normalize(raw);
      const candidate =
        normalized && typeof normalized === 'object' && 'id' in (normalized as Record<string, unknown>)
          ? normalized
          : { ...((normalized as Record<string, unknown>) ?? {}), id: snapshot.id };
      return schema.parse(candidate);
    },
  };
}
