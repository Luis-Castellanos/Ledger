"use client";

export const SIDEBAR_EVENT = "vault:sidebar";
export const SIDEBAR_OPEN_KEY = "vault:sidebar:open";
export const SIDEBAR_WIDTH_KEY = "vault:sidebar:width";

export const SIDEBAR_DEFAULT_WIDTH = 256;
export const SIDEBAR_MIN_WIDTH = 224;
export const SIDEBAR_MAX_WIDTH = 320;

export type SidebarState = {
  open: boolean;
  width: number;
};

function clampWidth(value: number) {
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, Math.round(value)));
}

export function readSidebarState(): SidebarState {
  if (typeof window === "undefined") {
    return { open: true, width: SIDEBAR_DEFAULT_WIDTH };
  }

  const open = window.localStorage.getItem(SIDEBAR_OPEN_KEY) !== "false";
  const widthRaw = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
  const width = Number.isFinite(widthRaw) && widthRaw > 0 ? clampWidth(widthRaw) : SIDEBAR_DEFAULT_WIDTH;

  return { open, width };
}

export function writeSidebarState(patch: Partial<SidebarState>) {
  if (typeof window === "undefined") {
    return;
  }

  const next = { ...readSidebarState(), ...patch };
  next.width = clampWidth(next.width);

  window.localStorage.setItem(SIDEBAR_OPEN_KEY, String(next.open));
  window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(next.width));
  window.dispatchEvent(new CustomEvent<SidebarState>(SIDEBAR_EVENT, { detail: next }));
}
