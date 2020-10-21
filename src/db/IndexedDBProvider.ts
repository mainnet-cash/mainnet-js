import Dexie from "dexie";
import StorageProvider from "./StorageProvider";
import { Wallet, RegTestWallet, TestNetWallet } from "../wallet/Wif";
import { WalletI } from "./interface";
import { walletFromId } from "../wallet/createWallet";

export default class IndexedDBProvider
  extends Dexie
  implements StorageProvider {
  private db: Dexie.Table<WalletI, number>;

  public constructor(dbName: string) {
    super(dbName);
    this.version(2).stores({
      wallet: "++id,name,wallet",
    });
    this.db = this.table("wallet");
  }

  public async init() {
    return true;
  }

  public async close() {
    return false;
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

  public async getWallet(
    name: string
  ): Promise<Wallet | TestNetWallet | RegTestWallet | undefined> {
    let obj = await this.db.get({ name: name });
    if (obj) {
      let w = await walletFromId(obj.wallet);
      w.name = obj!.name;
      return w;
    } else {
      return;
    }
  }

  public async getWallets(): Promise<
    Array<Wallet | TestNetWallet | RegTestWallet>
  > {
    let walletObjects = await this.transaction("r", this.db, async () => {
      return await this.db.where("id").above(0).toArray();
    });
    if (walletObjects) {
      const WalletArray: (
        | Wallet
        | TestNetWallet
        | RegTestWallet
      )[] = await Promise.all(
        walletObjects.map(async (obj: WalletI) => {
          let w = await walletFromId(obj.wallet);
          w.name = obj!.name;
          return w;
        })
      );
      return WalletArray;
    } else {
      return [];
    }
  }
}
