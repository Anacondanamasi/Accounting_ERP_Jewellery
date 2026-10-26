import { useState, useEffect, useRef } from "react";
import { Lock, Delete, KeyRound, LogOut, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const getWorkstationLockSettings = () => {
  try {
    const raw = localStorage.getItem("jewel_app_lock_settings");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    enabled: false,
    pin: "1234",
    timeoutMinutes: 15,
  };
};

export const saveWorkstationLockSettings = (settings: {
  enabled: boolean;
  pin: string;
  timeoutMinutes: number;
}) => {
  localStorage.setItem("jewel_app_lock_settings", JSON.stringify(settings));
};

export const triggerWorkstationLock = () => {
  sessionStorage.setItem("jewel_workstation_locked", "true");
  window.dispatchEvent(new Event("jewel_workstation_lock_change"));
};

export const triggerWorkstationUnlock = () => {
  sessionStorage.removeItem("jewel_workstation_locked");
  window.dispatchEvent(new Event("jewel_workstation_lock_change"));
};

export const WorkstationLockModal = () => {
  const [isLocked, setIsLocked] = useState(() => {
    return sessionStorage.getItem("jewel_workstation_locked") === "true";
  });
  const [pinInput, setPinInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync lock state
  useEffect(() => {
    const handleLockEvent = () => {
      const locked = sessionStorage.getItem("jewel_workstation_locked") === "true";
      setIsLocked(locked);
      if (locked) {
        setPinInput("");
        setErrorMsg("");
      }
    };

    window.addEventListener("jewel_workstation_lock_change", handleLockEvent);

    // Auto-lock inactivity timer
    let timer: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timer);
      const settings = getWorkstationLockSettings();
      if (settings.enabled && settings.timeoutMinutes > 0) {
        timer = setTimeout(() => {
          triggerWorkstationLock();
        }, settings.timeoutMinutes * 60 * 1000);
      }
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener("jewel_workstation_lock_change", handleLockEvent);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (isLocked) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isLocked]);

  if (!isLocked) return null;

  const handleDigit = (digit: string) => {
    if (pinInput.length >= 6) return;
    const next = pinInput + digit;
    setPinInput(next);
    setErrorMsg("");

    const settings = getWorkstationLockSettings();
    if (next === settings.pin) {
      triggerWorkstationUnlock();
      toast.success("Workstation unlocked");
    } else if (next.length === settings.pin.length) {
      setErrorMsg("Incorrect PIN. Please try again.");
      setPinInput("");
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg("");
  };

  const handleFullLogout = () => {
    triggerWorkstationUnlock();
    logout();
    navigate("/login");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-charcoal/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm rounded-card border border-border/20 bg-card p-6 shadow-2xl text-center">
        {/* Lock Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold shadow-inner">
          <Lock className="h-7 w-7" />
        </div>

        <h3 className="mt-4 font-display text-xl font-bold text-charcoal">
          Workstation Locked
        </h3>
        <p className="mt-1 text-xs text-muted">
          Active session for <strong className="text-charcoal">{user?.fullName || "Staff"}</strong>
        </p>

        {/* PIN Dots */}
        <div className="my-5 flex items-center justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-4 w-4 rounded-full border transition-all ${
                pinInput.length > idx
                  ? "border-gold bg-gold scale-110 shadow-sm"
                  : "border-slate-300 bg-slate-100"
              }`}
            />
          ))}
        </div>

        {/* Hidden input for keyboard typing */}
        <input
          ref={inputRef}
          type="password"
          maxLength={6}
          value={pinInput}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            setPinInput(val);
            const settings = getWorkstationLockSettings();
            if (val === settings.pin) {
              triggerWorkstationUnlock();
              toast.success("Workstation unlocked");
            } else if (val.length >= settings.pin.length) {
              setErrorMsg("Incorrect PIN. Please try again.");
              setPinInput("");
            }
          }}
          className="sr-only"
          autoFocus
        />

        {errorMsg && (
          <div className="mb-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-ruby animate-shake">
            <AlertCircle className="h-3.5 w-3.5" />
            {errorMsg}
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="mx-auto grid max-w-[240px] grid-cols-3 gap-2.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="flex h-12 items-center justify-center rounded-btn border border-border bg-slate-50 font-display text-lg font-bold text-charcoal shadow-sm transition-all hover:bg-gold/10 hover:border-gold active:scale-95"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPinInput("")}
            className="flex h-12 items-center justify-center rounded-btn border border-border text-xs font-semibold text-muted hover:bg-slate-100 transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="flex h-12 items-center justify-center rounded-btn border border-border bg-slate-50 font-display text-lg font-bold text-charcoal shadow-sm transition-all hover:bg-gold/10 hover:border-gold active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="flex h-12 items-center justify-center rounded-btn border border-border text-muted hover:bg-slate-100 hover:text-ruby transition-colors"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Bottom Options */}
        <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
          <button
            type="button"
            onClick={() => setShowForgot(!showForgot)}
            className="text-muted hover:text-charcoal hover:underline"
          >
            Forgot PIN?
          </button>

          <button
            type="button"
            onClick={handleFullLogout}
            className="inline-flex items-center gap-1 text-ruby hover:underline font-semibold"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>

        {showForgot && (
          <div className="mt-3 rounded bg-slate-100 p-2 text-2xs text-muted">
            The default factory PIN is <strong>1234</strong>. If changed and forgotten, click "Sign Out" to log in with your primary email and password.
          </div>
        )}
      </div>
    </div>
  );
};
export default WorkstationLockModal;
