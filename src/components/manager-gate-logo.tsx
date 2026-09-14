import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { setMode } from "@/lib/session-mode";
import { supabase } from "@/integrations/supabase/client";

/** Brand logo that opens the manager console after 7 quick taps and a real sign-in. */
export function ManagerGateLogo() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const taps = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleTap() {
    taps.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      taps.current = 0;
    }, 2000);
    if (taps.current >= 7) {
      taps.current = 0;
      setOpen(true);
    }
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error("That email and password do not match.");
        return;
      }
      setMode("manager");
      setOpen(false);
      navigate({ to: "/manager" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleTap}
        aria-label="EXO"
        className="select-none rounded-md focus:outline-none"
      >
        <BrandLogo />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manager sign in</DialogTitle>
            <DialogDescription>
              Signing in here replaces the cashier session on this device.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={unlock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gate-email">Email</Label>
              <Input
                id="gate-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gate-password">Password</Label>
              <Input
                id="gate-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
