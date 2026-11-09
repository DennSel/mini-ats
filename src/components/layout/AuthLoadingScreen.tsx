import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useAts } from "@/lib/ats-store";
import { AmbientBackground, Logo } from "@/components/shared";
import { Button } from "@/components/ui/button";

const LOADING_MESSAGES = [
  "Kallar till första intervju...",
  "Stämmer av referenser...",
  "Skickar ett artigt nej tack...",
] as const;

const ROTATE_INTERVAL_MS = 1800;
const WATCHDOG_TIMEOUT_MS = 8000;

export function AuthLoadingScreen() {
  const { refreshUser } = useAts();
  const [index, setIndex] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTimedOut(false);
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, WATCHDOG_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [attempt]);

  const handleRetry = async () => {
    setRetrying(true);
    setAttempt((a) => a + 1);
    try {
      await refreshUser();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <AmbientBackground />
      <Logo className="justify-center" />
      {!timedOut ? (
        <div className="mt-6 flex flex-col items-center gap-3" role="status" aria-live="polite">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm font-medium text-muted-foreground">{LOADING_MESSAGES[index]}</p>
        </div>
      ) : (
        <div className="mt-6 max-w-xs space-y-3">
          <p className="text-sm text-muted-foreground">
            Det tar längre tid än väntat att nå servern.
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry} disabled={retrying}>
            <RotateCcw className="h-3.5 w-3.5" /> Försök igen
          </Button>
        </div>
      )}
    </div>
  );
}
