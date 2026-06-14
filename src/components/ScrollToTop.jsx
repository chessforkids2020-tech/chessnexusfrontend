import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop - Globally resets scroll position to the top on every page navigation.
 * Place this once inside <BrowserRouter> and it applies to all routes automatically.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
