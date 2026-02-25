// =============================================================================
// app/hooks/useSyncStatus.ts
// =============================================================================
// React hook that subscribes to SyncService and re-renders whenever the
// sync status changes. Also polls the pending record count every 15s so
// the badge stays accurate even between sync cycles.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { SyncService } from "../services/SyncService";
import type { SyncStatus } from "../types/types";

interface SyncStatusHook {
  status:       SyncStatus;
  pendingCount: number;
  isSyncing:    boolean;
  syncNow:      () => Promise<void>;
}

export function useSyncStatus(): SyncStatusHook {
  const [status,       setStatus]       = useState<SyncStatus>(SyncService.getStatus());
  const [pendingCount, setPendingCount] = useState(0);

  // Subscribe to status changes
  useEffect(() => {
    const unsubscribe = SyncService.onStatusChange((s) => setStatus(s));
    return unsubscribe;
  }, []);

  // Poll pending count every 15 seconds
  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      const count = await SyncService.getPendingCount();
      if (mounted) setPendingCount(count);
    };

    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Also refresh count whenever status changes (sync just completed)
  useEffect(() => {
    SyncService.getPendingCount().then(setPendingCount);
  }, [status]);

  const syncNow = useCallback(async () => {
    await SyncService.syncNow();
  }, []);

  return {
    status,
    pendingCount,
    isSyncing: status === "syncing",
    syncNow,
  };
}