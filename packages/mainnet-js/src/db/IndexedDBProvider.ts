import Dexie from "dexie";
import StorageProvider from "./StorageProvider.js";
import { WalletI } from "./interface.js";

export default class IndexedDBProvider
  extends Dexie
  implements StorageProvider
{
  public db: Dexie.Table<WalletI, number>;

  public constructor(dbName: string) {
    super(dbName);
    this.version(3).stores({
      wallet: "name",
    });
    this.db = this.table("wallet");
  }

  public async init() {
    return this;
  }

  public async close() {
    return this;
  }

  public getInfo() {
    return "indexedDB";
  }

  public async addWallet(name: string, walletId: string): Promise<boolean> {
    return this.transaction("rw", this.db, async () => {
      if ((await this.db.where({ name: name }).count()) === 0) {
        await this.db.add({ name: name, wallet: walletId }).catch((e) => {
          throw Error(e);
        });
        return true;
      } else {
        return false;
      }
    }).catch((e) => {
      throw e.stack || e;
    });
  }

  public async getWallet(name: string): Promise<WalletI | undefined> {
    let obj = await this.db.get({ name: name });
    if (obj) {
      return obj;
    } else {
      return;
    }
  }

  public async getWallets(): Promise<Array<WalletI>> {
    let walletObjects = await this.transaction("r", this.db, async () => {
      return await this.db.where("id").above(0).toArray();
    });
    if (walletObjects) {
      const WalletArray: WalletI[] = await Promise.all(
        walletObjects.map(async (obj: WalletI) => {
          return obj;
        })
      );
      return WalletArray;
    } else {
      return [];
    }
  }

  public async updateWallet(name: string, walletId: string): Promise<void> {
    this.transaction("rw", this.db, async () => {
      const collection = this.db.where({ name: name });
      if ((await collection.count()) === 0) {
        return false;
      } else {
        const wallet = (await collection.first())!;
        await this.db
          .put({ id: wallet.id!, name: name, wallet: walletId }, wallet.id!)
          .catch((e) => {
            throw Error(e);
          });
        return true;
      }
    }).catch((e) => {
      throw e.stack || e;
    });
  }

  public async walletExists(name: string): Promise<boolean> {
    return (await this.getWallet(name)) !== undefined;
  }
}
