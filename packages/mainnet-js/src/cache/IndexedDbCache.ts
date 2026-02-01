import { CacheProvider } from "./interface";

// super thin wrapper around indexedDB, compatible with localStorage API
export class IndexedDbCache implements CacheProvider {
  private db: IDBDatabase | null = null;

  constructor(
    private objectStoreName: string = "ElectrumNetworkProviderCache"
  ) {
    this.objectStoreName = objectStoreName;
  }

  private getDatabaseObjectFromTarget(
    target: EventTarget | null
  ): IDBDatabase | null {
    if (!target) {
      return null;
    }

    const targetWithType = target as IDBOpenDBRequest;

    return targetWithType.result;
  }

  private throwDatabaseOpenError(
    reject: (reason: unknown) => void,
    database: IDBDatabase | null
  ) {
    if (!database) {
      reject(
        new Error(
          "Something went wrong and the database transaction was not opened."
        )
      );
    }
  }

  async init() {
    const db = indexedDB.open(this.objectStoreName, 1);

    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = db;

      request.onerror = reject;

      request.onsuccess = ({ target }: Event) => {
        const database = this.getDatabaseObjectFromTarget(target);

        this.throwDatabaseOpenError(reject, database);

        resolve(database as IDBDatabase);
      };

      request.onupgradeneeded = ({ target }: IDBVersionChangeEvent) => {
        const database = this.getDatabaseObjectFromTarget(target);

        this.throwDatabaseOpenError(reject, database);

        database?.createObjectStore(this.objectStoreName);
      };
    });
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database is not initialized");
    }

    const transaction = this.db.transaction(this.objectStoreName, "readwrite");
    const objectStore = transaction.objectStore(this.objectStoreName);

    return new Promise((resolve, reject) => {
      const request = objectStore.put(value, key);

      request.onerror = reject;
      request.onsuccess = () => resolve();
    });
  }

  async getItem(key: string): Promise<string | null> {
    if (!this.db) {
      throw new Error("Database is not initialized");
    }

    const transaction = this.db.transaction(this.objectStoreName, "readonly");
    const objectStore = transaction.objectStore(this.objectStoreName);

    return new Promise((resolve, reject) => {
      const request = objectStore.get(key);

      request.onerror = reject;
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  async removeItem(key: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database is not initialized");
    }

    const transaction = this.db.transaction(this.objectStoreName, "readwrite");
    const objectStore = transaction.objectStore(this.objectStoreName);

    return new Promise((resolve, reject) => {
      const request = objectStore.delete(key);

      request.onerror = reject;
      request.onsuccess = () => resolve();
    });
  }

  async getItems(keys: string[]): Promise<Map<string, string | null>> {
    if (!this.db) {
      throw new Error("Database is not initialized");
    }

    const transaction = this.db.transaction(this.objectStoreName, "readonly");
    const objectStore = transaction.objectStore(this.objectStoreName);

    const results = new Map<string, string | null>();
    const requests = keys.map((key) => ({
      key,
      request: objectStore.get(key),
    }));

    return new Promise((resolve, reject) => {
      transaction.onerror = reject;
      transaction.oncomplete = () => {
        for (const { key, request } of requests) {
          results.set(key, request.result ?? null);
        }
        resolve(results);
      };
    });
  }

  async setItems(entries: [string, string][]): Promise<void> {
    if (!this.db) {
      throw new Error("Database is not initialized");
    }

    if (entries.length === 0) return;

    const transaction = this.db.transaction(this.objectStoreName, "readwrite");
    const objectStore = transaction.objectStore(this.objectStoreName);

    for (const [key, value] of entries) {
      objectStore.put(value, key);
    }

    return new Promise((resolve, reject) => {
      transaction.onerror = reject;
      transaction.oncomplete = () => resolve();
    });
  }

  async clear(): Promise<void> {
    if (!this.db) {
      throw new Error("Database is not initialized");
    }

    const transaction = this.db.transaction(this.objectStoreName, "readwrite");
    const objectStore = transaction.objectStore(this.objectStoreName);

    return new Promise((resolve, reject) => {
      const request = objectStore.clear();

      request.onerror = reject;
      request.onsuccess = () => resolve();
    });
  }
}
