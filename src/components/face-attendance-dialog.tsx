import { Check, Loader2, LogIn, LogOut, ScanFace, ShieldAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { StaffAvatar } from "@/components/staff-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useUpsertAttendance } from "@/lib/api";
import {
  FACE_SCORE_THRESHOLD,
  MATCH_THRESHOLD,
  PRIVACY_NOTICE,
  bestMatch,
  loadFaceEngine,
  parseDescriptor,
  readFace,
} from "@/lib/face";
import {
  formatDate,
  formatTime,
  hoursBetween,
  isLateCheckIn,
  STATUS_LABEL,
  todayKey,
  type AppSettings,
  type Staff,
} from "@/lib/domain";

type Mode = "in" | "out";

type Outcome =
  | { kind: "matched"; staff: Staff; score: number; message: string; time: string; status: string }
  | { kind: "duplicate"; staff: Staff; message: string }
  | { kind: "unknown"; message: string };

export function FaceAttendanceDialog({
  staff,
  settings,
  trigger,
}: {
  staff: Staff[];
  settings: AppSettings;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("in");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Starting camera…");
  const [faceVisible, setFaceVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const upsert = useUpsertAttendance();

  const enrolled = staff.filter((s) => s.is_active && parseDescriptor(s.face_descriptor));

  const stop = useCallback(() => {
    if (loopRef.current) window.clearTimeout(loopRef.current);
    loopRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setReady(false);
    try {
      setStatus("Initializing face recognition…");
      await loadFaceEngine((stage) => setStatus(stage));
      setStatus("Starting camera…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setReady(true);
      setStatus("Camera ready — position your face inside the frame");
    } catch (err) {
      console.error("[face] attendance start failed", err);
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access to use face attendance."
          : err instanceof Error
            ? err.message
            : "Camera or face model could not start on this device.",
      );
    }
  }, []);


  useEffect(() => {
    if (!open) {
      stop();
      setReady(false);
      setOutcome(null);
      setFaceVisible(false);
      return;
    }
    void start();
    return stop;
  }, [open, start, stop]);

  useEffect(() => {
    if (!open || !ready || outcome || busy) return;
    let cancelled = false;
    async function tick() {
      if (cancelled || !videoRef.current) return;
      try {
        const reading = await readFace(videoRef.current);
        if (!cancelled) {
          const ok = Boolean(reading && reading.score >= FACE_SCORE_THRESHOLD);
          setFaceVisible(ok);
          setStatus(ok ? "Face detected — tap Recognise" : "Position your face inside the frame");
        }
      } catch {
        /* keep scanning */
      }
      if (!cancelled) loopRef.current = window.setTimeout(() => void tick(), 300);
    }
    void tick();
    return () => {
      cancelled = true;
      if (loopRef.current) window.clearTimeout(loopRef.current);
    };
  }, [open, ready, outcome, busy]);

  async function recognise() {
    if (!videoRef.current) return;
    if (enrolled.length === 0) {
      toast.error("No staff member has a registered face yet");
      return;
    }
    setBusy(true);
    setStatus("Recognising…");
    try {
      const reading = await readFace(videoRef.current);
      if (!reading || reading.score < FACE_SCORE_THRESHOLD) {
        setOutcome({ kind: "unknown", message: "No clear face detected" });
        return;
      }
      if (reading.real !== null && reading.real < 0.5) {
        setOutcome({ kind: "unknown", message: "Live face required — a screen or printed photo was detected" });
        return;
      }
      const match = bestMatch(reading.embedding, enrolled);
      if (!match || match.score < MATCH_THRESHOLD) {
        setOutcome({ kind: "unknown", message: "Face not recognized" });
        return;
      }
      await mark(match.staff, match.score);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Recognition failed");
      setStatus("Recognition failed — try again");
    } finally {
      setBusy(false);
    }
  }

  async function mark(member: Staff, score: number) {
    const now = new Date();
    const date = todayKey();
    const { data: existing, error: readError } = await supabase
      .from("attendance")
      .select("*")
      .eq("staff_id", member.id)
      .eq("date", date)
      .maybeSingle();
    if (readError) throw readError;

    if (mode === "in") {
      if (existing?.check_in) {
        setOutcome({
          kind: "duplicate",
          staff: member,
          message: `Already checked in today at ${formatTime(existing.check_in)}`,
        });
        return;
      }
      const late = isLateCheckIn(now, settings.work_start.slice(0, 5), settings.late_grace_minutes);
      await upsert.mutateAsync({
        staff_id: member.id,
        date,
        status: late ? "late" : "present",
        check_in: now.toISOString(),
        check_out: existing?.check_out ?? null,
        worked_hours: existing?.worked_hours ?? 0,
        overtime_hours: existing?.overtime_hours ?? 0,
        photo_path: existing?.photo_path ?? null,
        check_out_photo_path: existing?.check_out_photo_path ?? null,
        verification_method: "face",
        face_match_score: Math.round(score * 1000) / 1000,
      });
      setOutcome({
        kind: "matched",
        staff: member,
        score,
        message: "Attendance Marked",
        time: now.toLocaleTimeString(),
        status: late ? STATUS_LABEL.late : STATUS_LABEL.present,
      });
    } else {
      if (!existing?.check_in) {
        setOutcome({
          kind: "duplicate",
          staff: member,
          message: "No check-in recorded today — check in first",
        });
        return;
      }
      if (existing.check_out) {
        setOutcome({
          kind: "duplicate",
          staff: member,
          message: `Already checked out today at ${formatTime(existing.check_out)}`,
        });
        return;
      }
      const worked = hoursBetween(existing.check_in, now.toISOString());
      const overtime = Math.max(0, Math.round((worked - Number(member.working_hours)) * 100) / 100);
      await upsert.mutateAsync({
        staff_id: member.id,
        date,
        status: existing.status,
        check_in: existing.check_in,
        check_out: now.toISOString(),
        worked_hours: worked,
        overtime_hours: overtime,
        photo_path: existing.photo_path,
        check_out_photo_path: existing.check_out_photo_path,
        verification_method: "face",
        face_match_score: Math.round(score * 1000) / 1000,
      });
      setOutcome({
        kind: "matched",
        staff: member,
        score,
        message: `Checked out — ${worked}h worked`,
        time: now.toLocaleTimeString(),
        status: STATUS_LABEL[existing.status],
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Face attendance</DialogTitle>
          <DialogDescription>
            Look at the camera — the recognised staff member is marked automatically. No manual
            selection needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="w-full">
              <TabsTrigger value="in" className="flex-1">
                <LogIn className="size-4" /> Check in
              </TabsTrigger>
              <TabsTrigger value="out" className="flex-1">
                <LogOut className="size-4" /> Check out
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-muted">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="size-full scale-x-[-1] object-cover"
            />
            <span
              className={`pointer-events-none absolute inset-[12%] rounded-[40%] border-2 transition-colors ${
                faceVisible ? "border-success" : "border-background/70 border-dashed"
              }`}
            />
            {!ready && !error ? (
              <span className="absolute inset-0 grid place-items-center bg-background/70">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </span>
            ) : null}
            {busy ? (
              <span className="absolute inset-0 grid place-items-center gap-2 bg-background/70 text-sm">
                <Loader2 className="size-6 animate-spin text-primary" /> Recognising…
              </span>
            ) : null}
          </div>

          {outcome?.kind === "matched" ? (
            <div className="animate-in fade-in zoom-in-95 space-y-2 rounded-xl bg-success-soft p-4">
              <p className="flex items-center gap-2 font-semibold text-success">
                <Check className="size-5" /> ✅ {outcome.message}
              </p>
              <div className="flex items-center gap-3">
                <StaffAvatar name={outcome.staff.full_name} path={outcome.staff.photo_path} />
                <div className="text-sm">
                  <p className="font-medium">{outcome.staff.full_name}</p>
                  <p className="num text-xs text-muted-foreground">
                    {outcome.staff.staff_code} · {formatDate(todayKey())} · {outcome.time}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status {outcome.status} · match {Math.round(outcome.score * 100)}%
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {outcome?.kind === "duplicate" ? (
            <div className="rounded-xl bg-warning-soft p-4 text-sm">
              <p className="font-semibold">{outcome.staff.full_name}</p>
              <p className="text-muted-foreground">{outcome.message}</p>
            </div>
          ) : null}

          {outcome?.kind === "unknown" ? (
            <p className="flex items-center gap-2 rounded-xl bg-destructive-soft p-4 text-sm font-medium text-destructive">
              <X className="size-4" /> ❌ {outcome.message}
            </p>
          ) : null}

          <p className="text-sm text-muted-foreground">{error ?? status}</p>
          {enrolled.length === 0 ? (
            <p className="rounded-lg bg-warning-soft p-3 text-xs">
              No registered faces yet. Open a staff profile and use “Register Face” first.
            </p>
          ) : null}

          {error ? (
            <Button variant="ghost" onClick={() => void start()}>
              Try camera again
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {outcome ? (
                <Button variant="outline" onClick={() => setOutcome(null)}>
                  Scan another person
                </Button>
              ) : (
                <Button onClick={() => void recognise()} disabled={!ready || busy} size="lg">
                  <ScanFace className="size-4" /> Recognise & mark
                </Button>
              )}
            </div>
          )}

          <p className="flex gap-2 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            {PRIVACY_NOTICE}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
