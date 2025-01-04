'use client';
import { DrawingFrame } from '@/types/draw';

const DB_NAME = 'MakeYourGifDB';
const FRAMES_PER_BATCH = 10;

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
          const framesStore = db.createObjectStore('frames', { keyPath: 'id' });
          framesStore.createIndex('order', 'order', { unique: false });
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

  async saveFrames(frames: DrawingFrame[]): Promise<void> {
    if (!this.db) await this.init();

    const tx = this.db!.transaction('frames', 'readwrite');
    const store = tx.objectStore('frames');

    // Clear existing frames
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onerror = () => reject(clearRequest.error);
      clearRequest.onsuccess = () => resolve();
    });

    // Save frames in batches
    for (let i = 0; i < frames.length; i += FRAMES_PER_BATCH) {
      const batch = frames.slice(i, i + FRAMES_PER_BATCH);
      await Promise.all(
        batch.map(
          (frame) =>
            new Promise<void>((resolve, reject) => {
              const request = store.put({ ...frame, order: frame.id });
              request.onerror = () => reject(request.error);
              request.onsuccess = () => resolve();
            })
        )
      );
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
      const index = store.index('order');

      const frames: DrawingFrame[] = [];
      const cursorRequest = index.openCursor(IDBKeyRange.lowerBound(startIndex));

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor && frames.length < count) {
          const { ...frame } = cursor.value;
          frames.push(frame);
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
      const index = store.index('order');
      const request = index.get(0);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          const { ...frame } = request.result;
          resolve(frame);
        } else {
          resolve(null);
        }
      };
    });
  }

  async saveBlob(id: string, blob: Blob): Promise<void> {
    if (!this.db) await this.init();

    // Compress blob before saving if it's an image
    let compressedBlob = blob;
    if (blob.type.startsWith('image/')) {
      try {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = URL.createObjectURL(blob);
        });

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        URL.revokeObjectURL(img.src);

        compressedBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 1);
        });

        canvas.width = 0;
        canvas.height = 0;
      } catch (error) {
        console.warn('Failed to compress blob:', error);
      }
    }

    const tx = this.db!.transaction('blobs', 'readwrite');
    const store = tx.objectStore('blobs');

    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        id,
        blob: compressedBlob,
        timestamp: Date.now(),
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });

    await this.cleanupOldBlobs();
  }

  async getBlob(id: string): Promise<Blob | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('blobs', 'readonly');
      const store = tx.objectStore('blobs');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.blob || null);
    });
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
