/**
 * One upload policy for every surface that accepts a file: chat attachments,
 * expert case-note attachments, provider credentials, self-reported results and
 * lab reports.
 *
 * The prototype has no upload service, so this is the rule the real backend
 * must also enforce. The client check is a courtesy that saves a wasted upload
 * and gives an immediate reason; it is never the protection.
 */
export type UploadKind = "MEDIA" | "DOCUMENT" | "PROFILE_PHOTO";

const POLICIES: Record<
  UploadKind,
  { accept: string; extensions: string[]; maxBytes: number; humanTypes: string; humanLimit: string }
> = {
  PROFILE_PHOTO: {
    accept: "image/jpeg,image/png",
    extensions: ["jpg", "jpeg", "png"],
    maxBytes: 5 * 1024 * 1024,
    humanTypes: "JPG or PNG",
    humanLimit: "5MB",
  },
  /** Photos and short clips a patient or expert adds to a conversation or note. */
  MEDIA: {
    accept: "image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,application/pdf",
    extensions: ["jpg", "jpeg", "png", "webp", "heic", "mp4", "mov", "pdf"],
    maxBytes: 20 * 1024 * 1024,
    humanTypes: "Photo, video or PDF",
    humanLimit: "20MB",
  },
  /** Licences, certificates and results: a scan or a photo of a document. */
  DOCUMENT: {
    accept: "application/pdf,image/jpeg,image/png,image/heic",
    extensions: ["pdf", "jpg", "jpeg", "png", "heic"],
    maxBytes: 10 * 1024 * 1024,
    humanTypes: "PDF, JPG or PNG",
    humanLimit: "10MB",
  },
};

export function uploadPolicy(kind: UploadKind) {
  return POLICIES[kind];
}

/** Returns null when the file is acceptable, or the reason to show the person. */
export function uploadProblem(file: File, kind: UploadKind): string | null {
  const policy = POLICIES[kind];
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const typeAllowed =
    policy.accept.split(",").includes(file.type) ||
    (!file.type && policy.extensions.includes(extension));
  if (!typeAllowed) return `That file type isn't supported here. Use ${policy.humanTypes}.`;
  if (file.size === 0) return "That file is empty. Pick another one.";
  if (file.size > policy.maxBytes)
    return `That file is ${Math.round(file.size / 1024 / 1024)}MB. The limit is ${policy.humanLimit}.`;
  return null;
}
