import Dexie from "dexie";
import StorageProvider from "./StorageProvider";
import { WalletI } from "./interface";

export default class IndexedDBProvider
  extends Dexie
  implements StorageProvider {
  private db: Dexie.Table<WalletI, number>;

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

  public async addWallet(name: string, wallet: string): Promise<boolean> {
    return this.transaction("rw", this.db, async () => {
      if ((await this.db.where({ name: name }).count()) === 0) {
        await this.db.add({ name: name, wallet: wallet }).catch((e) => {
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
}
