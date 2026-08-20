/**
 * Real face recognition helpers built on @vladmandic/human.
 *
 * The model runs entirely in the browser: it detects a face, checks liveness /
 * anti-spoof signals, and produces a 1024-dimension face embedding. Only the
 * embedding is persisted (staff.face_descriptor) — never a raw biometric photo.
 *
 * This module touches browser-only APIs, so it must only ever be imported
 * lazily from an effect or event handler (never at SSR module scope).
 */
import type { Human } from "@vladmandic/human";

/**
 * Models are served from this app's own /public/models folder, so they are part
 * of the production build and never depend on a third-party CDN (jsdelivr
 * returns 403 for these files, which is what caused the endless
 * "Face model loading…" state).
 */
const MODEL_BASE = "/models/";

/** Cosine similarity threshold above which two embeddings are the same person. */
export const MATCH_THRESHOLD = 0.62;
/** Minimum detector confidence for a usable face. */
export const FACE_SCORE_THRESHOLD = 0.6;
/** Hard cap on initialization time before we surface an error. */
export const FACE_INIT_TIMEOUT_MS = 20_000;

export const FACE_INIT_TIMEOUT_MESSAGE =
  "Face recognition could not start. Please check your internet connection or configuration and try again.";

let humanPromise: Promise<Human> | null = null;

export type FaceLoadStage =
  | "Initializing face recognition…"
  | "Loading face detector…"
  | "Loading recognition model…"
  | "Warming up models…"
  | "Models ready";

/**
 * Loads (once) and caches the face engine in memory. Reports coarse progress
 * and rejects after FACE_INIT_TIMEOUT_MS instead of hanging forever.
 */
export function loadFaceEngine(onStage?: (stage: FaceLoadStage) => void): Promise<Human> {
  if (!humanPromise) {
    humanPromise = (async () => {
      onStage?.("Initializing face recognition…");
      const { Human: HumanCtor } = await import("@vladmandic/human");
      onStage?.("Loading face detector…");
      const human = new HumanCtor({
        modelBasePath: MODEL_BASE,
        cacheSensitivity: 0,
        debug: false,
        filter: { enabled: true, equalization: false },
        face: {
          enabled: true,
          detector: { maxDetected: 1, rotation: false },
          mesh: { enabled: true },
          iris: { enabled: false },
          description: { enabled: true },
          emotion: { enabled: false },
          antispoof: { enabled: true },
          liveness: { enabled: true },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: false },
        segmentation: { enabled: false },
      });
      onStage?.("Loading recognition model…");
      await human.load();
      onStage?.("Warming up models…");
      await human.warmup();
      onStage?.("Models ready");
      return human;
    })().catch((error: unknown) => {
      // Allow a retry to start from scratch instead of re-awaiting a rejection.
      humanPromise = null;
      console.error("[face] model initialization failed", error);
      throw error;
    });
  }

  const engine = humanPromise;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(FACE_INIT_TIMEOUT_MESSAGE)), FACE_INIT_TIMEOUT_MS);
  });
  return Promise.race([engine, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<Human>;
}


export type FaceReading = {
  embedding: number[];
  score: number;
  /** Anti-spoof score (higher = more likely a real face, not a screen/print). */
  real: number | null;
  /** Liveness score from the liveness model. */
  live: number | null;
};

/** Run one detection pass over a live video element. */
export async function readFace(video: HTMLVideoElement): Promise<FaceReading | null> {
  if (!video.videoWidth) return null;
  const human = await loadFaceEngine();
  const result = await human.detect(video);
  const face = result.face?.[0];
  if (!face || !face.embedding || face.embedding.length === 0) return null;
  return {
    embedding: Array.from(face.embedding),
    score: face.faceScore ?? face.score ?? 0,
    real: typeof face.real === "number" ? face.real : null,
    live: typeof face.live === "number" ? face.live : null,
  };
}

/** Cosine similarity between two stored embeddings, 0..1. */
export function similarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

/** Parse a face_descriptor jsonb value back into an embedding array. */
export function parseDescriptor(value: unknown): number[] | null {
  if (Array.isArray(value) && value.every((n) => typeof n === "number")) {
    return value as number[];
  }
  if (value && typeof value === "object" && "embedding" in value) {
    const inner = (value as { embedding: unknown }).embedding;
    if (Array.isArray(inner) && inner.every((n) => typeof n === "number")) return inner as number[];
  }
  return null;
}

/** Best matching candidate out of enrolled staff embeddings. */
export function bestMatch<T extends { id: string; face_descriptor: unknown }>(
  probe: number[],
  candidates: T[],
): { staff: T; score: number } | null {
  let best: { staff: T; score: number } | null = null;
  for (const candidate of candidates) {
    const stored = parseDescriptor(candidate.face_descriptor);
    if (!stored) continue;
    const score = similarity(probe, stored);
    if (!best || score > best.score) best = { staff: candidate, score };
  }
  return best;
}

export const PRIVACY_NOTICE =
  "Face data is biometric information. Only collect it with the employee's informed consent and keep it strictly for attendance, in line with the privacy laws that apply to your business.";
