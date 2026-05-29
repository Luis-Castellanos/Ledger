"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  SIDEBAR_EVENT,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  readSidebarState,
  writeSidebarState,
  type SidebarState,
} from "@/lib/sidebar-state";
import { Avatar } from "@/components/avatar";
import { resolveSections } from "@/components/nav-config";
import { PROFILE_EVENT, type NavSection, type ProfileData } from "@/lib/profile/avatars";
import { IconPanelLeft, IconSettings } from "@/components/nav-icons";
import { ThemeToggle } from "@/components/theme-toggle";

const DragHandle = ({ className = "" }: { className?: string }) => (
  <svg aria-hidden className={className} fill="currentColor" height="14" viewBox="0 0 11 14" width="11">
    <circle cx="3" cy="3" r="1.2" />
    <circle cx="8" cy="3" r="1.2" />
    <circle cx="3" cy="7" r="1.2" />
    <circle cx="8" cy="7" r="1.2" />
    <circle cx="3" cy="11" r="1.2" />
    <circle cx="8" cy="11" r="1.2" />
  </svg>
);

const fallbackProfile: ProfileData = {
  name: "Personal ledger",
  email: "",
  avatarKind: "gradient",
  avatarGradient: "institutional",
  avatarImage: null,
  navHidden: [],
  navLayout: [],
};
const hasClerkClientConfig = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function Sidebar({ reviewCount }: { reviewCount?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => readSidebarState().open);
  const [width, setWidth] = useState(() => readSidebarState().width);
  const [profile, setProfile] = useState<ProfileData>(fallbackProfile);
  const [dragging, setDragging] = useState<string | null>(null);
  const draggingRef = useRef(false);
  const dragItem = useRef<string | null>(null);
  const dragSection = useRef<string | null>(null);

  useEffect(() => {
    function onState(event: Event) {
      const detail = (event as CustomEvent<SidebarState>).detail;
      if (!detail) {
        return;
      }
      setOpen(detail.open);
      setWidth(detail.width);
    }

    window.addEventListener(SIDEBAR_EVENT, onState);
    return () => window.removeEventListener(SIDEBAR_EVENT, onState);
  }, []);

  useEffect(() => {
    let alive = true;

    fetch("/api/profile", { headers: { Accept: "application/json" } })
      .then((response) => response.json())
      .then((payload: { data?: ProfileData }) => {
        if (alive && payload.data) {
          setProfile(payload.data);
        }
      })
      .catch(() => {});

    function onProfile(event: Event) {
      const detail = (event as CustomEvent<ProfileData>).detail;
      if (detail) {
        setProfile(detail);
      }
    }

    window.addEventListener(PROFILE_EVENT, onProfile);
    return () => {
      alive = false;
      window.removeEventListener(PROFILE_EVENT, onProfile);
    };
  }, []);

  function onResizePointerDown(event: React.PointerEvent) {
    event.preventDefault();
    draggingRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";
    let lastWidth = width;

    function onMove(moveEvent: PointerEvent) {
      if (!draggingRef.current) {
        return;
      }
      const nextWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, Math.round(moveEvent.clientX)));
      lastWidth = nextWidth;
      setWidth(nextWidth);
    }

    function onUp() {
      draggingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      writeSidebarState({ width: lastWidth });
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function collapseSidebar() {
    writeSidebarState({ open: false });
  }

  function showSidebar() {
    writeSidebarState({ open: true });
  }

  function persistLayout(navLayout: NavSection[]) {
    setProfile((current) => ({ ...current, navLayout }));
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ navLayout }),
    })
      .then((response) => response.json())
      .then((payload: { data?: ProfileData }) => {
        if (payload.data) {
          window.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: payload.data }));
        }
      })
      .catch(() => {});
  }

  const cloneLayout = () => (profile.navLayout ?? []).map((section) => ({ ...section, items: [...section.items] }));

  const removeHref = (layout: NavSection[], href: string) => {
    for (const section of layout) {
      const index = section.items.indexOf(href);
      if (index >= 0) {
        section.items.splice(index, 1);
      }
    }
  };

  function dropOnItem(targetHref: string, sectionId: string) {
    const href = dragItem.current;
    dragItem.current = null;
    setDragging(null);
    if (!href || href === targetHref) {
      return;
    }

    const layout = cloneLayout();
    removeHref(layout, href);
    const target = layout.find((section) => section.id === sectionId);
    if (!target) {
      return;
    }
    const index = target.items.indexOf(targetHref);
    target.items.splice(index < 0 ? target.items.length : index, 0, href);
    persistLayout(layout);
  }

  function dropOnSection(sectionId: string) {
    if (dragSection.current) {
      const draggedSectionId = dragSection.current;
      dragSection.current = null;
      setDragging(null);
      if (draggedSectionId === sectionId) {
        return;
      }

      const layout = cloneLayout();
      const from = layout.findIndex((section) => section.id === draggedSectionId);
      const to = layout.findIndex((section) => section.id === sectionId);
      if (from < 0 || to < 0) {
        return;
      }
      const [moved] = layout.splice(from, 1);
      layout.splice(to, 0, moved!);
      persistLayout(layout);
      return;
    }

    const href = dragItem.current;
    dragItem.current = null;
    setDragging(null);
    if (!href) {
      return;
    }

    const layout = cloneLayout();
    removeHref(layout, href);
    const target = layout.find((section) => section.id === sectionId);
    if (!target) {
      return;
    }
    target.items.push(href);
    persistLayout(layout);
  }

  if (!open) {
    return (
      <button
        aria-label="Show sidebar"
        className="fixed left-3 top-3 z-50 flex size-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-1 text-text-secondary shadow-sm transition-colors hover:bg-surface-2 hover:text-accent-300 print:hidden"
        onClick={showSidebar}
        title="Show sidebar"
        type="button"
      >
        <IconPanelLeft size={17} />
      </button>
    );
  }

  const sections = resolveSections(profile.navLayout, profile.navHidden);

  return (
    <aside className="sticky top-0 flex h-screen shrink-0 flex-col border-r border-border-subtle bg-surface-1 print:hidden" style={{ width }}>
      <div className="flex items-center gap-2.5 px-3 pb-2.5 pt-3">
        <Link className="group flex min-w-0 flex-1 items-center gap-2.5" href="/settings" title="Profile & settings">
          <Avatar
            className="ring-1 ring-border-subtle"
            gradient={profile.avatarGradient}
            image={profile.avatarImage}
            kind={profile.avatarKind}
            name={profile.name}
            size={34}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold transition-colors group-hover:text-accent-300">{profile.name || "Personal ledger"}</div>
            <div className="truncate text-[11px] text-text-muted">{profile.email || "Owner"}</div>
          </div>
        </Link>
        <button
          aria-label="Hide sidebar"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary"
          onClick={collapseSidebar}
          title="Hide sidebar"
          type="button"
        >
          <IconPanelLeft size={17} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-2 pb-3 pt-2">
        {sections.map((section) => (
          <div
            className="group/sec flex flex-col gap-0.5"
            key={section.id}
            onDragOver={(event) => {
              if (dragItem.current || dragSection.current) {
                event.preventDefault();
              }
            }}
            onDrop={() => dropOnSection(section.id)}
          >
            <div
              className={`flex cursor-grab items-center gap-1.5 px-3 pb-1.5 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-text-tertiary active:cursor-grabbing ${
                dragging === `section:${section.id}` ? "opacity-40" : ""
              }`}
              draggable
              onDragEnd={() => {
                dragSection.current = null;
                setDragging(null);
              }}
              onDragStart={() => {
                dragSection.current = section.id;
                setDragging(`section:${section.id}`);
              }}
              title="Drag to reorder section"
            >
              <DragHandle className="opacity-0 transition-opacity group-hover/sec:opacity-50" />
              <span className="truncate">{section.label}</span>
            </div>
            {section.items.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.Icon;
              return (
                <div
                  className="group/row relative"
                  draggable
                  key={item.href}
                  onDragEnd={() => {
                    dragItem.current = null;
                    setDragging(null);
                  }}
                  onDragOver={(event) => {
                    if (dragItem.current) {
                      event.preventDefault();
                    }
                  }}
                  onDragStart={(event) => {
                    dragItem.current = item.href;
                    setDragging(item.href);
                    event.stopPropagation();
                  }}
                  onDrop={(event) => {
                    event.stopPropagation();
                    dropOnItem(item.href, section.id);
                  }}
                >
                  <Link
                    className={`relative flex items-center justify-between gap-2 rounded-lg py-2.5 pl-3.5 pr-3 text-[15px] transition-colors ${
                      active ? "bg-accent-soft font-semibold text-accent-300" : "font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                    } ${dragging === item.href ? "opacity-40" : ""}`}
                    href={item.href}
                  >
                    {active ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-500" /> : null}
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className="shrink-0" size={20} strokeWidth={active ? 2 : 1.8} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {item.showBadge && reviewCount !== undefined && reviewCount > 0 ? (
                        <span className="rounded-md bg-accent-500 px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-white">{reviewCount}</span>
                      ) : null}
                      <DragHandle className="cursor-grab text-text-muted opacity-0 transition-opacity group-hover/row:opacity-60 active:cursor-grabbing" />
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex items-center justify-around border-t border-border-subtle px-4 py-3.5">
        <Link
          aria-label="Settings"
          className="flex size-9 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-2 hover:text-accent-300"
          href="/settings"
          title="Settings"
        >
          <IconSettings size={18} />
        </Link>
        <ThemeToggle className="flex size-9 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary" />
        <div className="flex size-9 items-center justify-center">
          {hasClerkClientConfig ? <UserButton /> : <Avatar gradient={profile.avatarGradient} image={profile.avatarImage} kind={profile.avatarKind} name={profile.name} size={28} />}
        </div>
      </div>

      <div
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize transition-colors hover:bg-accent-500/30"
        onPointerDown={onResizePointerDown}
        role="separator"
        title="Drag to resize"
      />
    </aside>
  );
}
