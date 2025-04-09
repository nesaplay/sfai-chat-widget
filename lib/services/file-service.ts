import { fileStorage, StoredFile } from '@/lib/storage/file-storage';

export class FileService {
  // Server-side methods
  static getFileFromStorage(filename: string): StoredFile | undefined {
    return fileStorage.get(filename);
  }

  static getFileBuffer(filename: string): Buffer | undefined {
    return fileStorage.get(filename)?.buffer;
  }

  // Client-side methods
  static async fetchFile(filename: string): Promise<File> {
    const response = await fetch(`/api/upload?filename=${filename}`);
    const blob = await response.blob();
    
    // Get metadata
    const metadataResponse = await fetch(`/api/upload?filename=${filename}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    const { metadata } = await metadataResponse.json();

    return new File([blob], metadata.name, {
      type: metadata.type,
      lastModified: metadata.lastModified
    });
  }

  static async uploadFile(file: File): Promise<{ success: boolean; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    return response.json();
  }

  static async listFiles(): Promise<{ filename: string; metadata: StoredFile['metadata'] }[]> {
    const response = await fetch('/api/upload');
    const { files } = await response.json();
    return files;
  }
} 