import Dexie from "dexie";

interface Wallet {
  id?: number;
  name: string;
  wallet: string;
}

//
// Declare Database
//
export class WalletDatabase extends Dexie {
  public wallet: Dexie.Table<Wallet, number>; // id is number in this case

  public constructor(dbName: string) {
    super(dbName);
    this.version(2).stores({
      wallet: "++id,name,wallet",
    });
    this.wallet = this.table("wallet");

  }

  public async addWallet({
    name,
    wallet,
  }: {
    name: string;
    wallet: string;
  }): Promise<void> {
    // Make sure we have something in DB:

    return this.transaction('rw', this.wallet, async () => {

      // Make sure we have something in DB:
      if ((await this.wallet.where({ name: name }).count()) === 0) {
        const id = await this.wallet.add({ name: name, wallet: wallet });
      }
    }).catch(e => {
      throw (e.stack || e);
    });


  }




  public async getWallets() {

    let wallets = await this.transaction('r', this.wallet, async () => {
      return await this.wallet.where("id").above(0).toArray();
    });
    return wallets

  }
}
