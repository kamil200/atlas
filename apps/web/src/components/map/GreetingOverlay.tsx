import { useEffect, useState } from "react";
import { QUOTES } from "@/lib/quotes";

const SESSION_KEY = "chowk.greeted";
const FADE_AFTER_MS = 2500;

/* Light Hinglish belongs here and nowhere near an error message (BRAND §6). */
function greeting(hour: number): string {
  if (hour < 5) return "Still up. The chowk is quiet at this hour.";
  if (hour < 12) return "Bright and early. The chowk is all yours.";
  if (hour < 17) return "Afternoon. Good time for a wander.";
  if (hour < 21) return "Shaam ho gayi. Let's see who's hiring.";
  return "Late one. The good roles keep odd hours too.";
}

/*
  Shown once per browser session on the map. It fades on a timer or the first
  thing the user does, whichever comes first — a greeting you have to dismiss
  is not a greeting.
*/
export function GreetingOverlay() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setVisible(true);

    /*
      The session key is written on dismiss, not on mount. Writing it here meant
      StrictMode's second mount read the key its own first mount had just
      written, bailed before arming the timer, and left the greeting parked over
      the map for the rest of the session in development.
    */
    const dismiss = () => {
      sessionStorage.setItem(SESSION_KEY, "1");
      setLeaving(true);
    };
    const timer = setTimeout(dismiss, FADE_AFTER_MS);
    window.addEventListener("pointerdown", dismiss, { once: true });
    window.addEventListener("keydown", dismiss, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, []);

  if (!visible) return null;

  const now = new Date();
  // Day of year keeps the quote stable for a whole day rather than per render.
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  const quote = QUOTES[dayOfYear % QUOTES.length];

  return (
    <div
      aria-live="polite"
      onTransitionEnd={() => leaving && setVisible(false)}
      className={`pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center px-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        leaving ? "-translate-y-2 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="max-w-md rounded-lg border border-line bg-paper/95 px-5 py-4 text-center shadow-pop backdrop-blur-sm">
        <p className="text-sm font-medium text-ink">{greeting(now.getHours())}</p>
        <p className="mt-1.5 text-xs italic text-ink-soft">{quote}</p>
      </div>
    </div>
  );
}
