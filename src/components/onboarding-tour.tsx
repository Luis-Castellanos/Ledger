"use client";

import { useEffect } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_DONE_KEY = "ledger:tour:v1";
export const START_TOUR_EVENT = "ledger:start-tour";

const STEPS: DriveStep[] = [
  {
    popover: {
      title: "Welcome to your ledger 👋",
      description:
        "A quick lap around the app — it takes about thirty seconds, and you can leave any time with Esc.",
    },
  },
  {
    element: "[data-tour='net-worth']",
    popover: {
      title: "Your net worth, day by day",
      description:
        "Every balance you record draws this line. Assets minus what you owe — switch ranges to zoom the story in or out.",
    },
  },
  {
    element: "[data-tour='kpis']",
    popover: {
      title: "This month at a glance",
      description: "Money in, money out, and what's left. Transfers between your own accounts never distort these numbers.",
    },
  },
  {
    element: "[data-tour='review-card']",
    popover: {
      title: "The review queue",
      description:
        "New transactions wait here for a quick once-over. It's keyboard-first: A accepts the suggested category, S skips.",
    },
  },
  {
    element: "[data-tour='budgets-card']",
    popover: {
      title: "Budgets",
      description: "Set monthly intentions per category and watch real spending track against them.",
    },
  },
  {
    element: "[data-tour='goals-card']",
    popover: {
      title: "Goals",
      description: "Give a savings target a deadline — link it to an account or log contributions by hand.",
    },
  },
  {
    element: "[data-tour='nav-transactions']",
    popover: {
      title: "The register",
      description: "Every transaction, searchable and filterable. Click any row to edit; select many to fix in bulk.",
    },
  },
  {
    element: "[data-tour='nav-imports']",
    popover: {
      title: "Bring your statements in",
      description: "Drop a bank CSV here — duplicates are caught automatically and nothing commits until you say so.",
    },
  },
  {
    popover: {
      title: "One last trick",
      description: "Press Ctrl+K (⌘K on Mac) anywhere to jump between pages. Enjoy — it's your money, beautifully kept.",
    },
  },
];

function runTour() {
  const tour = driver({
    showProgress: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 12,
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    steps: STEPS.filter((step) => !step.element || document.querySelector(step.element as string)),
    onDestroyed: () => {
      try {
        localStorage.setItem(TOUR_DONE_KEY, new Date().toISOString());
      } catch {
        /* private mode — the tour will simply offer itself again */
      }
    },
  });
  tour.drive();
}

/*
 * Mounts inside the dashboard's data-loaded state. Auto-runs once per
 * browser for first-time users (desktop widths only — the sidebar targets
 * are hidden on mobile), and re-runs on demand via the start-tour event
 * fired from the command palette.
 */
export function OnboardingTour() {
  useEffect(() => {
    const onStart = () => runTour();
    window.addEventListener(START_TOUR_EVENT, onStart);

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!localStorage.getItem(TOUR_DONE_KEY) && window.innerWidth >= 768) {
        timer = setTimeout(runTour, 900);
      }
    } catch {
      /* storage unavailable — skip auto-run */
    }

    return () => {
      window.removeEventListener(START_TOUR_EVENT, onStart);
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  return null;
}
