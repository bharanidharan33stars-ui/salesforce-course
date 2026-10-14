import fs from "node:fs/promises";
import path from "node:path";

/**
 * Storage abstraction for generated documents.
 *
 * The certificate service only talks to this interface, so switching from the
 * local filesystem to S3/GCS/Azure Blob later means adding one adapter - no
 * certificate logic has to change.
 */

export interface StorageAdapter {
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// Vercel's root filesystem is read-only: use its writable /tmp scratch space
// there (a cold instance simply regenerates a PDF it no longer has on disk).
const CERT_DIR = process.env.CERTIFICATE_STORAGE_DIR
  ? path.resolve(process.env.CERTIFICATE_STORAGE_DIR)
  : process.env.VERCEL
    ? "/tmp/sla-certificates"
    : path.resolve(__dirname, "../../storage/certificates");

function resolveKey(key: string): string {
  // Prevent path traversal: keys are plain file names such as "cert_12.pdf".
  const safe = path.basename(key);
  if (safe !== key) throw new Error("Invalid storage key");
  return path.join(CERT_DIR, safe);
}

export class LocalFileStorage implements StorageAdapter {
  private readonly dir: string;

  constructor(dir: string = CERT_DIR) {
    this.dir = dir;
  }

  async save(key: string, data: Buffer): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const target = path.join(this.dir, path.basename(key));
    // Write to a temp file first, then rename: readers never see partial PDFs.
    const tmp = `${target}.tmp-${Date.now()}`;
    await fs.writeFile(tmp, data);
    await fs.rename(tmp, target);
  }

  async read(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(resolveKey(key));
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(resolveKey(key));
    } catch {
      /* already gone */
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.dir, path.basename(key)));
      return true;
    } catch {
      return false;
    }
  }
}

export const certificateStorage = new LocalFileStorage();
export const CERTIFICATES_DIR = CERT_DIR;
