'use client';
import { DrawingFrame } from '@/types/draw';

const DB_NAME = 'MakeYourGifDB';
const FRAMES_PER_BATCH = 20;

interface DBSchema {
  frames: DrawingFrame[];
  blobs: {
    id: string;
    blob: Blob;
    timestamp: number;
  }[];
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('unload', () => {
        this.deleteDatabase();
      });

      this.deleteDatabase();
    }
  }

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    // Delete existing database before initializing
    await this.deleteDatabase();

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('frames')) {
          db.createObjectStore('frames', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('blobs')) {
          const blobStore = db.createObjectStore('blobs', { keyPath: 'id' });
          blobStore.createIndex('timestamp', 'timestamp');
        }
      };
    });

    return this.initPromise;
  }

  async deleteDatabase(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      this.initPromise = null;

      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error deleting database:', error);
    }
  }

  private async blobFromBlobURL(blobOrUrl: Blob | string): Promise<Blob> {
    if (blobOrUrl instanceof Blob) {
      return blobOrUrl;
    }

    if (typeof blobOrUrl === 'string' && blobOrUrl.startsWith('blob:')) {
      const response = await fetch(blobOrUrl);
      return await response.blob();
    }

    throw new Error('Invalid input: must be a Blob or Blob URL');
  }

  private async convertBlobUrlToBase64(url: string): Promise<string> {
    if (!url.startsWith('blob:')) {
      return url;
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting Blob URL to base64:', error);
      return url;
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (error) => {
        console.error('Error converting blob to base64:', error);
        reject(error);
      };
      reader.readAsDataURL(blob);
    });
  }

  async saveFrames(frames: DrawingFrame[]): Promise<void> {
    if (!this.db) await this.init();

    await new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction('frames', 'readwrite');
      const store = tx.objectStore('frames');
      const clearRequest = store.clear();
      clearRequest.onerror = () => reject(clearRequest.error);
      clearRequest.onsuccess = () => resolve();
    });

    for (let i = 0; i < frames.length; i += FRAMES_PER_BATCH) {
      const batch = frames.slice(i, i + FRAMES_PER_BATCH);

      // Convert any Blob URLs to base64 before saving
      const processedBatch = await Promise.all(
        batch.map(async (frame) => ({
          ...frame,
          imageData: await this.convertBlobUrlToBase64(frame.imageData),
        }))
      );

      await new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction('frames', 'readwrite');
        const store = tx.objectStore('frames');

        let error: Error | null = null;

        tx.onerror = () => {
          error = tx.error;
        };

        tx.oncomplete = () => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        };

        processedBatch.forEach((frame) => {
          const request = store.put(frame);
          request.onerror = () => {
            error = request.error;
          };
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  async getFrameCount(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('frames', 'readonly');
      const store = tx.objectStore('frames');
      const countRequest = store.count();

      countRequest.onerror = () => reject(countRequest.error);
      countRequest.onsuccess = () => resolve(countRequest.result);
    });
  }

  async getFramesBatch(
    startIndex: number,
    count: number = FRAMES_PER_BATCH
  ): Promise<DrawingFrame[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('frames', 'readonly');
      const store = tx.objectStore('frames');
      const frames: DrawingFrame[] = [];

      const cursorRequest = store.openCursor(IDBKeyRange.lowerBound(startIndex));

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor && frames.length < count) {
          frames.push(cursor.value);
          cursor.continue();
        } else {
          resolve(frames);
        }
      };

      cursorRequest.onerror = () => reject(cursorRequest.error);
    });
  }

  async getFirstFrame(): Promise<DrawingFrame | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('frames', 'readonly');
      const store = tx.objectStore('frames');
      const request = store.get(0);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async saveBlob(id: string, blobOrUrl: Blob | string): Promise<void> {
    if (!this.db) await this.init();

    try {
      console.log('Converting blob to base64...');
      let base64Data: string;

      if (blobOrUrl instanceof Blob) {
        base64Data = await this.blobToBase64(blobOrUrl);
      } else if (blobOrUrl.startsWith('blob:')) {
        const response = await fetch(blobOrUrl);
        const blob = await response.blob();
        base64Data = await this.blobToBase64(blob);
      } else {
        base64Data = blobOrUrl;
      }

      console.log('Saving to IndexedDB...');
      const tx = this.db!.transaction('blobs', 'readwrite');
      const store = tx.objectStore('blobs');

      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          id,
          blob: base64Data,
          timestamp: Date.now(),
        });

        request.onerror = () => {
          console.error('Error saving blob:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          console.log('Blob saved successfully');
          resolve();
        };
      });

      await this.cleanupOldBlobs();
    } catch (error) {
      console.error('Error in saveBlob:', error);
      throw error;
    }
  }

  async getBlob(id: string): Promise<Blob | null> {
    if (!this.db) await this.init();

    try {
      const data = await new Promise<{ blob: string } | undefined>((resolve, reject) => {
        const tx = this.db!.transaction('blobs', 'readonly');
        const store = tx.objectStore('blobs');
        const request = store.get(id);

        request.onerror = () => {
          console.error('Error getting blob:', request.error);
          reject(request.error);
        };
        request.onsuccess = () => resolve(request.result);
      });

      if (!data?.blob) return null;

      // If it's a base64 string, convert it back to Blob
      if (typeof data.blob === 'string' && data.blob.startsWith('data:')) {
        const response = await fetch(data.blob);
        return await response.blob();
      }

      return null;
    } catch (error) {
      console.error('Error in getBlob:', error);
      throw error;
    }
  }

  private async cleanupOldBlobs(): Promise<void> {
    const tx = this.db!.transaction('blobs', 'readwrite');
    const store = tx.objectStore('blobs');
    const timestampIndex = store.index('timestamp');

    const allBlobs = await new Promise<DBSchema['blobs']>((resolve, reject) => {
      const request = timestampIndex.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    if (allBlobs.length > 5) {
      const blobsToDelete = allBlobs.sort((a, b) => b.timestamp - a.timestamp).slice(5);

      for (const blob of blobsToDelete) {
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(blob.id);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      }
    }
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    const tx = this.db!.transaction(['frames', 'blobs'], 'readwrite');
    const framesStore = tx.objectStore('frames');
    const blobsStore = tx.objectStore('blobs');

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = framesStore.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      }),
      new Promise<void>((resolve, reject) => {
        const request = blobsStore.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      }),
    ]);
  }
}

export const dbService = new IndexedDBService();
