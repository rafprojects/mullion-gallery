/**
 * One host per page for a module-level store (P80-F).
 *
 * `notify` and `confirm` are module singletons, and a page can carry several
 * galleries, each with its own provider tree. Mounted once per gallery, every
 * host rendered every toast and every confirmation: measured on a two-gallery
 * page against the Mantine hosts of the time, one confirm opened two dialogs
 * and confirming both ran `onConfirm` twice. So a host may be mounted in every
 * root, which keeps the call shape Key Decision E promised, but only the first
 * one mounted renders. If it unmounts, the next one takes over. `main.tsx`
 * applies the same rule to Mantine's hosts until Phase 81 replaces them.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';

const claims = new Map<string, symbol[]>();
const listeners = new Set<() => void>();

function notifyAll(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether this host is the page's active one for `kind`. False until it has mounted. */
export function usePageHost(kind: string): boolean {
  const [token] = useState(() => Symbol(kind));

  useEffect(() => {
    const list = claims.get(kind) ?? [];
    claims.set(kind, list);
    list.push(token);
    notifyAll();
    return () => {
      const index = list.indexOf(token);
      if (index !== -1) list.splice(index, 1);
      notifyAll();
    };
  }, [kind, token]);

  return useSyncExternalStore(
    subscribe,
    () => claims.get(kind)?.[0] === token,
    () => false,
  );
}
