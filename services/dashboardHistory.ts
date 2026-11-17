export const dashboardBackGuardKey = "dailyBudgetDashboardBackGuard";

// React Navigation replaces its own history state as drawers open/close. Keep
// our dashboard-exit marker through same-route writes without changing its IDs
// or affecting navigation to another page.
export function preserveDashboardHistoryGuard() {
  const history = window.history;
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  const wrap = (original: History["pushState"]): History["pushState"] =>
    function (data, title, url) {
      const previous = history.state;
      const target = new URL(url || window.location.href, window.location.href);
      const sameDashboard =
        target.pathname === window.location.pathname &&
        target.pathname.replace(/\/+$/, "").endsWith("/dashboard");
      const next =
        sameDashboard &&
        previous?.[dashboardBackGuardKey] &&
        data &&
        typeof data === "object" &&
        data[dashboardBackGuardKey] === undefined
          ? {
              ...data,
              [dashboardBackGuardKey]: previous[dashboardBackGuardKey],
            }
          : data;
      original.call(history, next, title, url);
    };
  const push = wrap(originalPush),
    replace = wrap(originalReplace);
  history.pushState = push;
  history.replaceState = replace;
  return () => {
    if (history.pushState === push) history.pushState = originalPush;
    if (history.replaceState === replace)
      history.replaceState = originalReplace;
  };
}
