import Dexie from "dexie";
import StorageProvider from "./StorageProvider";
import { WalletI, WebHookI, WebHook } from "./interface";

export default class IndexedDBProvider
  extends Dexie
  implements StorageProvider {
  private db: Dexie.Table<WalletI, number>;

  public constructor(dbName: string) {
    super(dbName);
    this.version(2).stores({
      wallet: "++id,name,wallet"
    });
    this.db = this.table("wallet");
  }

  public async init() {
    return this;
  }

  public async close() {
    return this;
  }

  public async addWallet(name: string, wallet: string): Promise<boolean> {
    // Make sure we have something in DB:

    return this.transaction("rw", this.db, async () => {
      // Make sure we have something in DB:
      if ((await this.db.where({ name: name }).count()) === 0) {
        const id = await this.db
          .add({ name: name, wallet: wallet })
          .catch((e) => {
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
