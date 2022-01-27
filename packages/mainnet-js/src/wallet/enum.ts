export enum WalletTypeEnum {
  Wif = "wif",
  Seed = "seed",
  Hd = "hd",
  Watch = "watch",
  PrivateKey = "privkey",
}

export enum FeePaidByEnum {
  change = "change",
  first = "firstOutput",
  any = "anyOutputs",
  last = "lastOutput",
  changeThenFirst = "changeThenFirst",
  changeThenAny = "changeThenAny",
  changeThenLast = "changeThenLast",
}
