"use client";

import { useEffect } from "react";

export function BackHistory() {
  useEffect(() => {
    if ("navigation" in window && window.navigation) return;

    const history = window.history;
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    let active = true;

    // Older browsers do not expose the previous entry, so tag in-app entries as they are created.
    const push: History["pushState"] = (state, title, url) => {
      originalPush.call(history, active ? { ...state, fairyPreviousPage: window.location.href } : state, title, url);
    };
    const replace: History["replaceState"] = (state, title, url) => {
      const previous = history.state?.fairyPreviousPage ?? null;
      originalReplace.call(history, active ? { ...state, fairyPreviousPage: previous } : state, title, url);
    };

    history.pushState = push;
    history.replaceState = replace;
    return () => {
      active = false;
      if (history.pushState === push) history.pushState = originalPush;
      if (history.replaceState === replace) history.replaceState = originalReplace;
    };
  }, []);

  return null;
}
