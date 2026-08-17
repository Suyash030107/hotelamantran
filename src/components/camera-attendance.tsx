import { Camera, Loader2, LogIn, LogOut, RefreshCw } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { uploadPhoto, useUpsertAttendance } from "@/lib/api";
import {
  hoursBetween,
  isLateCheckIn,
  todayKey,
  type AppSettings,
  type Staff,
} from "@/lib/domain";

type Mode = "in" | "out";

export function CameraAttendanceDialog({
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
  const [staffId, setStaffId] = useState("");
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const upsert = useUpsertAttendance();

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setCameraError(
        "Camera access was blocked or is unavailable. Allow camera permission, or record attendance manually from the attendance table.",
      );
    } finally {
      setStarting(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void startCamera();
    } else {
      stopCamera();
      setShot(null);
      setCameraError(null);
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error("Camera is not ready yet");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Could not capture photo");
          return;
        }
        setShot({ blob, url: URL.createObjectURL(blob) });
      },
      "image/jpeg",
      0.85,
    );
  }

  async function save() {
    if (!staffId) {
      toast.error("Select the staff member");
      return;
    }
    const member = staff.find((s) => s.id === staffId);
    if (!member) return;

    setSaving(true);
    try {
      let photoPath: string | null = null;
      if (shot) {
        photoPath = await uploadPhoto(`attendance/${staffId}`, shot.blob, "jpg");
      }

      const now = new Date();
      const date = todayKey();

      const { data: existing, error: readError } = await supabase
        .from("attendance")
        .select("*")
        .eq("staff_id", staffId)
        .eq("date", date)
        .maybeSingle();
      if (readError) throw readError;

      if (mode === "in") {
        const late = isLateCheckIn(
          now,
          settings.work_start.slice(0, 5),
          settings.late_grace_minutes,
        );
        await upsert.mutateAsync({
          staff_id: staffId,
          date,
          status: late ? "late" : "present",
          check_in: now.toISOString(),
          check_out: existing?.check_out ?? null,
          worked_hours: existing?.worked_hours ?? 0,
          overtime_hours: existing?.overtime_hours ?? 0,
          photo_path: photoPath ?? existing?.photo_path ?? null,
        });
        toast.success(
          `${member.full_name} checked in${late ? " (marked late)" : ""} at ${now.toLocaleTimeString()}`,
        );
      } else {
        if (!existing?.check_in) {
          toast.error(`${member.full_name} has no check-in recorded today`);
          setSaving(false);
          return;
        }
        const worked = hoursBetween(existing.check_in, now.toISOString());
        const overtime = Math.max(0, Math.round((worked - Number(member.working_hours)) * 100) / 100);
        await upsert.mutateAsync({
          staff_id: staffId,
          date,
          status: existing.status,
          check_in: existing.check_in,
          check_out: now.toISOString(),
          worked_hours: worked,
          overtime_hours: overtime,
          photo_path: photoPath ?? existing.photo_path,
        });
        toast.success(`${member.full_name} checked out — ${worked} hours worked`);
      }

      setShot(null);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save attendance");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Camera attendance</DialogTitle>
          <DialogDescription>
            Capture a photo of the staff member as a check-in record, then select who it is.
            This stores a photo for verification — it is not automatic face recognition.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
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
            {shot ? (
              <img src={shot.url} alt="Captured attendance" className="size-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="size-full object-cover"
              />
            )}
            {starting ? (
              <span className="absolute inset-0 grid place-items-center bg-background/60">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </span>
            ) : null}
          </div>

          {cameraError ? (
            <p className="rounded-lg bg-destructive-soft p-3 text-sm text-destructive">
              {cameraError}
            </p>
          ) : null}

          <div className="flex gap-2">
            {shot ? (
              <Button type="button" variant="outline" onClick={() => setShot(null)}>
                <RefreshCw className="size-4" /> Retake
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={capture} disabled={!!cameraError}>
                <Camera className="size-4" /> Capture photo
              </Button>
            )}
            {cameraError ? (
              <Button type="button" variant="ghost" onClick={() => void startCamera()}>
                Try camera again
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="camera-staff">Staff member</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger id="camera-staff">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name} · {s.staff_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "in" ? "Record check-in" : "Record check-out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
