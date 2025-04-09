export interface StoredFile {
  buffer: Buffer;
  metadata: {
    name: string;
    type: string;
    size: number;
    lastModified: number;
  };
}

// Create a Map to store files in memory: filename -> file data
export const fileStorage = new Map<string, StoredFile>();
