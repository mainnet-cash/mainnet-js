import {
  derivePublicNodeCashaddr,
  getAddrsByXpubKey,
  getXpubKeyInfo,
} from "./getAddrsByXpubKey";

test("Should decode xpubInfo", async () => {
  let xpub =
    "xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj";
  let xpubInfo = getXpubKeyInfo(xpub);
  expect(xpubInfo.version).toBe("mainnet");
  expect(xpubInfo.depth).toBe(3);
  expect(xpubInfo.parentFingerprint).toBe("155bca59");
  expect(xpubInfo.childNumber).toBe(2147483648);
  expect(xpubInfo.chain).toBe(
    "3da4bc190a2680111d31fadfdc905f2a7f6ce77c6f109919116f253d43445219"
  );
  expect(xpubInfo.data).toBe(
    "03774c910fcf07fa96886ea794f0d5caed9afe30b44b83f7e213bb92930e7df4bd"
  );
  expect(xpubInfo.fingerprint).toBe("6cc9f252");
});

test("Should derive cashaddr given xpub and path", async () => {
  // abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
  // m/0
  const xpub =
    "xpub6F2iaK2JUPcgrZ6RTGH6t8VybLPu1XzfrHsDsaKvK6NfULznU6i6aw6ZoefDW2DpNruSLw73RwQg46qvpqB3eryeJJ2tkFCF4Z6gbr8Pjja";
  const vectors = [
    //  M/44'/145'/0'/0/0
    "bitcoincash:qqyx49mu0kkn9ftfj6hje6g2wfer34yfnq5tahq3q6",
    //  M/44'/145'/0'/0/1
    "bitcoincash:qp8sfdhgjlq68hlzka9lcsxtcnvuvnd0xqxugfzzc5",
    //  M/44'/145'/0'/0/2
    "bitcoincash:qqkuy34ntrye9a2h4xpdstcu4aq5wfrwscjtaphenr",
  ];

  for (let i = 0; i < vectors.length; i++) {
    // M/44'/145'/0'/0/
    const publicNode = await derivePublicNodeCashaddr(xpub, 0, `M/${i}`);
    expect(publicNode).toBe(vectors[i]);
  }
});

test("Should derive list of cashaddrs from m/44'/0'/0' given xpub path, & limit", async () => {
  // abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
  // m/44'/0'/0'
  const xpub =
    "xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj";
  const vectors = [
    // m/44'/0'/0'/0/0
    "bitcoincash:qrvcdmgpk73zyfd8pmdl9wnuld36zh9n4gms8s0u59",
    // m/44'/0'/0'/0/1
    "bitcoincash:qp4wzvqu73x22ft4r5tk8tz0aufdz9fescwtpcmhc7",
    // m/44'/0'/0'/0/2
    "bitcoincash:qr0kwqzf2h3wvjjhn4pg895lrxwp96wqgyhkksq2nh",
  ];

  // M/44'/0'/0'/0/i
  const cashaddrs = getAddrsByXpubKey(xpub, "0/0", 3);
  expect(cashaddrs).toStrictEqual(vectors);
});

test("Should derive list of change cashaddrs from m/44'/0'/0' given xpub path, & limit", async () => {
  // abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
  // m/44'/0'/0'
  const xpub =
    "xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj";
  const vectors = [
    // m/44'/0'/0'/1/0
    "bitcoincash:qzawj0yw07mgys3dy3uqkxsj54gwlapg7gjw8v3grk",
    // m/44'/0'/0'/1/1
    "bitcoincash:qqsqv86eghvyxcq7q5eg3l3ad7r7xcff65egddy9e9",
    // m/44'/0'/0'/1/2
    "bitcoincash:qrdexhxheryn7n2kf2s7g9kypfe0ynakrqm3j0f69w",
  ];

  // M/44'/0'/0'/0/i
  const cashaddrs = getAddrsByXpubKey(xpub, "1/0", 3);
  expect(cashaddrs).toStrictEqual(vectors);
});

test("Should derive list of cashaddrs from M/44'/145'/0' given xpub, path and limit", async () => {
  // abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
  // m/0
  const xpub =
    "xpub6ByHsPNSQXTWZ7PLESMY2FufyYWtLXagSUpMQq7Un96SiThZH2iJB1X7pwviH1WtKVeDP6K8d6xxFzzoaFzF3s8BKCZx8oEDdDkNnp4owAZ";
  const vectors = [
    //  M/44'/145'/0'/0/0
    "bitcoincash:qqyx49mu0kkn9ftfj6hje6g2wfer34yfnq5tahq3q6",
    //  M/44'/145'/0'/0/1
    "bitcoincash:qp8sfdhgjlq68hlzka9lcsxtcnvuvnd0xqxugfzzc5",
    //  M/44'/145'/0'/0/2
    "bitcoincash:qqkuy34ntrye9a2h4xpdstcu4aq5wfrwscjtaphenr",
  ];

  const cashaddrs = getAddrsByXpubKey(xpub, "0/0", 3);
  expect(cashaddrs).toStrictEqual(vectors);
});
test("Should derive list of change cashaddrs from M/44'/145'/0' given xpub, path and limit", async () => {
  // abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
  // m/0
  const xpub =
    "xpub6ByHsPNSQXTWZ7PLESMY2FufyYWtLXagSUpMQq7Un96SiThZH2iJB1X7pwviH1WtKVeDP6K8d6xxFzzoaFzF3s8BKCZx8oEDdDkNnp4owAZ";
  const vectors = [
    //  M/44'/145'/0'/1/0
    "bitcoincash:qr8aeharupyrmhfu0d4tdmsnc5y8cfk47y6qrsjsrx",
    //  M/44'/145'/0'/1/1
    "bitcoincash:qr88m3rp5nd5aerz5rh9lzly9u5pevykagwscmjk0c",
    //  M/44'/145'/0'/1/2
    "bitcoincash:qp57cex47jtyhedphe2c63gpzsx3zs0ryvejxly47d",
  ];
  const cashaddrs = getAddrsByXpubKey(xpub, "1/0", 3);
  expect(cashaddrs).toStrictEqual(vectors);
});
