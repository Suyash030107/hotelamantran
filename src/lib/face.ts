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

const MODEL_BASE = "https://cdn.jsdelivr.net/npm/@vladmandic/human-models/models/";

/** Cosine similarity threshold above which two embeddings are the same person. */
export const MATCH_THRESHOLD = 0.62;
/** Minimum detector confidence for a usable face. */
export const FACE_SCORE_THRESHOLD = 0.6;

let humanPromise: Promise<Human> | null = null;

export function loadFaceEngine(): Promise<Human> {
  if (!humanPromise) {
    humanPromise = (async () => {
      const { Human: HumanCtor } = await import("@vladmandic/human");
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
      await human.load();
      await human.warmup();
      return human;
    })();
  }
  return humanPromise;
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
