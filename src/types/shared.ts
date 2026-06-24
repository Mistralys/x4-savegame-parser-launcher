/**
 * Shared TypeScript interfaces used across component and hook boundaries.
 *
 * Some of these types are direct Tauri IPC payload shapes (SetupProgress,
 * InstalledPaths, UpdateInfo); others are React state shapes derived from
 * Tauri events (QueryProgress). They are co-located here because they are
 * referenced by more than one module and centralising them makes the
 * Rust–TypeScript contract explicit.
 */

// ─── Setup / Installation ─────────────────────────────────────────────────────

/** Progress event emitted by the `setup-progress` Tauri event during installation. */
export interface SetupProgress {
  step: string;
  message: string;
  percent: number;
}

/** Paths returned to the frontend after a successful `download_and_install_tools` call. */
export interface InstalledPaths {
  php_path: string;
  install_path: string;
}

/** Version comparison result returned by the `check_for_updates` Tauri command. */
export interface UpdateInfo {
  current_version: string | null;
  latest_version: string;
  update_available: boolean;
}

// ─── Query Progress ───────────────────────────────────────────────────────────

/**
 * React state shape maintained by the `useQueryProgress` hook.
 * Derived from `query-progress` Tauri events; not a direct IPC payload.
 */
export interface QueryProgress {
  inProgress: boolean;
  operation: string | null;
  message: string | null;
  startTime: number | null;
}
