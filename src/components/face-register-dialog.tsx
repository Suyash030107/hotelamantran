import { Check, Loader2, ScanFace, ShieldAlert, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

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
import { useUpdateStaff } from "@/lib/api";
import {
  FACE_SCORE_THRESHOLD,
  PRIVACY_NOTICE,
  loadFaceEngine,
  readFace,
  type FaceReading,
} from "@/lib/face";
import type { Staff } from "@/lib/domain";

export function FaceRegisterDialog({
  staff,
  trigger,
}: {
  staff: Staff;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("Starting camera…");
  const [ready, setReady] = useState(false);
  const [faceVisible, setFaceVisible] = useState(false);
  const [captured, setCaptured] = useState<FaceReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const updateStaff = useUpdateStaff();

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
      console.error("[face] register start failed", err);
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser to register a face."
          : err instanceof Error
            ? err.message
            : "Camera or face model could not start on this device.",
      );
    }
  }, []);


  useEffect(() => {
    if (!open) {
      stop();
      setCaptured(null);
      setReady(false);
      setFaceVisible(false);
      return;
    }
    void start();
    return stop;
  }, [open, start, stop]);

  // Live face-presence indicator loop.
  useEffect(() => {
    if (!open || !ready || captured) return;
    let cancelled = false;
    async function tick() {
      if (cancelled || !videoRef.current) return;
      try {
        const reading = await readFace(videoRef.current);
        if (!cancelled) {
          const ok = Boolean(reading && reading.score >= FACE_SCORE_THRESHOLD);
          setFaceVisible(ok);
          setStatus(ok ? "Face detected — hold still and capture" : "Position your face inside the frame");
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
  }, [open, ready, captured]);

  async function capture() {
    if (!videoRef.current) return;
    setStatus("Analysing face…");
    try {
      const reading = await readFace(videoRef.current);
      if (!reading || reading.score < FACE_SCORE_THRESHOLD) {
        setStatus("No clear face found — look straight at the camera and try again");
        toast.error("No clear face detected");
        return;
      }
      if (reading.real !== null && reading.real < 0.5) {
        setStatus("That looks like a photo of a screen — use the live camera");
        toast.error("Live face required");
        return;
      }
      setCaptured(reading);
      setStatus("Face captured — save to register");
    } catch {
      setStatus("Face analysis failed — try again");
    }
  }

  async function save() {
    if (!captured) return;
    setSaving(true);
    try {
      await updateStaff.mutateAsync({
        id: staff.id,
        face_descriptor: captured.embedding,
        face_enrolled_at: new Date().toISOString(),
      });
      toast.success(`Face registered for ${staff.full_name}`);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save face data");
    } finally {
      setSaving(false);
    }
  }

  async function removeFace() {
    setSaving(true);
    try {
      await updateStaff.mutateAsync({
        id: staff.id,
        face_descriptor: null,
        face_enrolled_at: null,
      });
      toast.success("Face data removed");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove face data");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Register face — {staff.full_name}</DialogTitle>
          <DialogDescription>
            The camera creates a mathematical face signature used to recognise this staff member at
            check-in. No face photo is stored.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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
                captured
                  ? "border-success"
                  : faceVisible
                    ? "border-success"
                    : "border-background/70 border-dashed"
              }`}
            />
            {captured ? (
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-success-soft px-3 py-2 text-sm font-medium text-success">
                <Check className="size-4" /> Face captured
              </span>
            ) : null}
            {!ready && !error ? (
              <span className="absolute inset-0 grid place-items-center bg-background/70">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </span>
            ) : null}
          </div>

          <p className="text-sm text-muted-foreground">{error ?? status}</p>

          {error ? (
            <Button variant="ghost" onClick={() => void start()}>
              Try camera again
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {captured ? (
                <Button variant="outline" onClick={() => setCaptured(null)}>
                  Retake
                </Button>
              ) : (
                <Button variant="outline" onClick={() => void capture()} disabled={!ready}>
                  <ScanFace className="size-4" /> Capture face
                </Button>
              )}
              {staff.face_descriptor ? (
                <Button variant="ghost" onClick={() => void removeFace()} disabled={saving}>
                  <Trash2 className="size-4" /> Remove registered face
                </Button>
              ) : null}
            </div>
          )}

          <p className="flex gap-2 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            {PRIVACY_NOTICE}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!captured || saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Save face
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
