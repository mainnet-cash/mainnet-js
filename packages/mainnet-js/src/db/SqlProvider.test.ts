import { default as SqlProvider } from "./SqlProvider";
import { RegTestWallet, TestNetWallet, Wallet } from "../wallet/Wif";
import { WebhookRecurrence, WebhookType } from "../webhook";
import { WalletI } from "./interface";

/**
 * @jest-environment jsdom
 */
test("Store and retrieve a Regtest wallet", async () => {
  let db = new SqlProvider(`regtest2 ${Math.random()}`);
  await db.init();
  let w1 = await RegTestWallet.newRandom();
  w1.name = "dave";
  await db.addWallet(w1.name, w1.toString());
  let w2 = await db.getWallet("dave");
  expect(w1.name).toBe(w2!.name);
  expect(w1.toString()).toBe(w2!.wallet);
  db.close();
});

test("Store and replace a Regtest wallet", async () => {
  let db = new SqlProvider(`regtest2 ${Math.random()}`);
  await db.init();

  expect(await db.walletExists("storereplace")).toBe(false);
  let w1 = await db.addWallet("storereplace", "keep seed");
  let w2 = await db.getWallet("storereplace");
  expect("keep seed").toBe(w2!.wallet);
  expect(await db.walletExists("storereplace")).toBe(true);

  let seedId = (
    await RegTestWallet.fromSeed(new Array(12).join("abandon "))
  ).toDbString();
  let w3 = await db.updateWallet("storereplace", seedId);
  let w4 = await db.getWallet("storereplace");
  expect(w4!.wallet).not.toBe("keep seed");
  expect(w4!.wallet).toBe(seedId);

  let w5 = await db.updateWallet("storereplace_nonexistent", seedId);
  let w6 = await db.getWallet("storereplace_nonexistent")!;
  expect(w6).toBe(undefined);

  db.close();
});

test("Store and retrieve a Testnet wallet", async () => {
  let db = new SqlProvider(`testnet ${Math.random()}`);
  await db.init();
  let w1 = await TestNetWallet.newRandom();
  w1.name = "dave";
  await db.addWallet(w1.name, w1.toString());
  let w2 = await db.getWallet(w1.name);
  expect(w1.name).toBe(w2!.name);
  expect(w1.toString()).toBe(w2!.wallet);
  db.close();
});

test("Store and retrieve a Wif wallet", async () => {
  let db = new SqlProvider(`mainnet ${Math.random()}`);
  await db.init();
  let w1 = await Wallet.newRandom();
  w1.name = "dave";
  await db.addWallet(w1.name, w1.toString());
  let w2 = await db.getWallet(w1.name);
  expect(w1.name).toBe(w2!.name);
  expect(w1.toString()).toBe(w2!.wallet);
  db.close();
});

test("Should handle basic sql injection", async () => {
  let sh = new SqlProvider(`still_here ${Math.random()}`);
  await sh.init();
  let w1 = await Wallet.newRandom();
  await sh.addWallet("okay", w1.toString());

  let db = new SqlProvider(`;DELETE table still_here; ${Math.random()}`);
  await db.init();
  let alice = await RegTestWallet.newRandom();
  let bob = await RegTestWallet.newRandom();
  let charlie = await RegTestWallet.newRandom();
  await db.addWallet("alice", alice.toString());
  await db.addWallet("bob", bob.toString());
  await db.addWallet("charlie", charlie.toString());
  let beforeWallets = await db.getWallets();
  expect(beforeWallets.length).toBe(3);
  let dave = await RegTestWallet.newRandom();
  await db.addWallet("; DELETE * FROM wallet limit 10;", dave.toString());
  await db.addWallet(
    "' or 1=1; DELETE * FROM wallet limit 10;",
    dave.toString()
  );
  await db.addWallet(
    "; DELETE FROM wallet WHERE GUID ='' OR '' = '';",
    dave.toString()
  );
  await db.addWallet("' or 1=1; TRUNCATE wallet;", dave.toString());
  await db.addWallet("' or 1=1; DROP table Wallet;", dave.toString());
  let wallets = await db.getWallets();
  expect(wallets.length).toBe(8);
  let otherTableWallets = await sh.getWallets();
  expect(otherTableWallets.length).toBe(1);
  db.close();
  sh.close();
});

test("Should fail registering SLP webhook without tokenId", async () => {
  let db = new SqlProvider(`regtest ${Math.random()}`);
  await db.init();
  await expect(
    db.addWebhook({
      cashaddr: "",
      url: "https://example.com/fail",
      type: WebhookType.slpTransactionIn,
      recurrence: WebhookRecurrence.recurrent,
    })
  ).rejects.toThrow();

  db.close();
});

test("Test wallet database name regression", async () => {
  const name = `test ${Math.random()}`;

  let wallet: Wallet, db: SqlProvider, dbWallet: WalletI | undefined;

  wallet = await Wallet.named(name);
  db = new SqlProvider("bitcoincash");
  await db.init();
  dbWallet = await db.getWallet(name);
  expect(wallet.toDbString()).toBe(dbWallet!.wallet);
  await db.close();

  wallet = await TestNetWallet.named(name);
  db = new SqlProvider("bchtest");
  await db.init();
  dbWallet = await db.getWallet(name);
  expect(wallet.toDbString()).toBe(dbWallet!.wallet);
  await db.close();

  wallet = await RegTestWallet.named(name);
  db = new SqlProvider("bchreg");
  await db.init();
  dbWallet = await db.getWallet(name);
  expect(wallet.toDbString()).toBe(dbWallet!.wallet);
  await db.close();
});

test("Should get ssl parameters from env", async () => {
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = "false";
  process.env.DATABASE_SSL_CA =
    "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURhekNDQWxPZ0F3SUJBZ0lVQ1A0Vi9Ca2lyL3ZSVFN6TVFVTkZ3N1JsOStNd0RRWUpLb1pJaHZjTkFRRUwKQlFBd1JURUxNQWtHQTFVRUJoTUNRVlV4RXpBUkJnTlZCQWdNQ2xOdmJXVXRVM1JoZEdVeElUQWZCZ05WQkFvTQpHRWx1ZEdWeWJtVjBJRmRwWkdkcGRITWdVSFI1SUV4MFpEQWVGdzB5TVRBNU16QXhOREF5TVRaYUZ3MHlOakE1Ck1qa3hOREF5TVRaYU1FVXhDekFKQmdOVkJBWVRBa0ZWTVJNd0VRWURWUVFJREFwVGIyMWxMVk4wWVhSbE1TRXcKSHdZRFZRUUtEQmhKYm5SbGNtNWxkQ0JYYVdSbmFYUnpJRkIwZVNCTWRHUXdnZ0VpTUEwR0NTcUdTSWIzRFFFQgpBUVVBQTRJQkR3QXdnZ0VLQW9JQkFRREpnSEVOY2VvUngwZDJmN0pyaXQ5ZTEzTXRITGF6YlpYbjFUR2JsT2JvCkVrcERQUStJeFJ4aTF5cDc0QmwwR2gyendFMzl5VDViUCs4R2RSUS9JdmV5OHJLOFdBREE0ZlhpbjFuSy9sckcKSmVEZzVSNk1TMEZLZWUrZFV5a1kya2lFK3o3RU41bFZ5RGNKWCs2NmI5cmhqM2ZsWEsyQWhBR0c2V1ZlSnBRNgoxWFVuZXhvSnFlWWhHTzlEYWRuWTZGMkhCbHBWUzJwaGEyMEZOWXh2V2RsV2NmdHdpTG8zSng2WEFRanhoc3h6ClA2c0lHcjRwbFRXZUNsOE5ySjNxZ25OQXI5bVBOZGVQYjRTU1cySVVieGdqaG02bDhGUTl1dW5qd0F4amhKWUQKTnN1R0Z2aEZreFErdlEwdi9MbHhuNUVTVStLWUo5QzlYV3dwQ3JXVlpxMzVBZ01CQUFHalV6QlJNQjBHQTFVZApEZ1FXQkJRNTBNdkdVazVwUWxhUThWN0VZVWdjSEJYcjhEQWZCZ05WSFNNRUdEQVdnQlE1ME12R1VrNXBRbGFRCjhWN0VZVWdjSEJYcjhEQVBCZ05WSFJNQkFmOEVCVEFEQVFIL01BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQngKWGFjcU9Cc3hwVzlzNXM4ZG11VzA1bUcwc1hjYktIeDFvclRuRWlHRFFueVNBNjEraVdMZ0RHMkFBR2RnWm0rTwpKMDNFNG15TllGb09QbkpRTVZmYlZaZ2lZOVd3WElOakhORmRHRWNwRkxEZ2p4MlZ3MUZBajQwN0c1K0VWK21rCnJyVloxbm0wNHhRaks4ck1FVnV1MmJzNUxMQkx6UWg4eGxSL0lVREtWK2E3UjJXbVRFSWEyaGJWMXN4cVZUblIKdkZjclVBOWNXaW1RMTVkcE1oOUxTbHRNRy9EclJGbWdDcHBNcHZPYlZyUVZUWTNpbzd3UmZ5OWx4Um1aTVFlTQpPQWszOXc3M002cHUwLzNNL0JqcnM4aE1kbHlZMkpWQmY5N2JBbS9ON2dUckhvckFXSWN0L0J3NWNyM0ZmYTYrCmxuRDRQS1Y4SFYrQTczVi84MitNCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K";
  process.env.DATABASE_SSL_KEY =
    "LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBeVlCeERYSHFFY2RIZG4reWE0cmZYdGR6TFJ5MnMyMlY1OVV4bTVUbTZCSktRejBQCmlNVWNZdGNxZStBWmRCb2RzOEJOL2NrK1d6L3ZCblVVUHlMM3N2S3l2RmdBd09IMTRwOVp5djVheGlYZzRPVWUKakV0QlNubnZuVk1wR05wSWhQcyt4RGVaVmNnM0NWL3V1bS9hNFk5MzVWeXRnSVFCaHVsbFhpYVVPdFYxSjNzYQpDYW5tSVJqdlEybloyT2hkaHdaYVZVdHFZV3R0QlRXTWIxblpWbkg3Y0lpNk55Y2Vsd0VJOFliTWN6K3JDQnErCktaVTFuZ3BmRGF5ZDZvSnpRSy9aanpYWGoyK0VrbHRpRkc4WUk0WnVwZkJVUGJycDQ4QU1ZNFNXQXpiTGhoYjQKUlpNVVByME5ML3k1Y1orUkVsUGltQ2ZRdlYxc0tRcTFsV2F0K1FJREFRQUJBb0lCQUQ2Y2xvUmkvU1NCRTRlUwpybElVV013VGprcGFQYnNMTmlWUGJaYTJjZmx5bFhqSEpHaVBOdjdQZFBnQTdtZlJKYUdSQTZyME9WZ0pTYkJyCitOcVZkdm8zeDZvV2ZrVnc4UUoyR1dTbUhIYXRsbTdMUXU2OUE1Q3N5dlBMdjExbGxsc2I1cWo1emIrRjh2UUsKeHhkUFltZnNPSWtnZnhrTDY1Mk1NRjlOQllveDg2YTgveE5DaGZ5MHFJdWRObmhOT3NyMnBHT1A4aTZmNWhVcgpLcW9SL3NMY3NjaHY2VGtvd0N0MjNzdmlkWUFseDlISE9NMTV1TGcrYUxhd1dWdkh0ZHlJUVU1aUxvck5EYVRECnozWW1Ob2p0UzdFa2VaTDBlZnJQa1pMUUhlcWgxTUkrQVo4RFZFQTFEa0dVaGRsVmhmUzhBQWhkRG1sb3RrRFYKcjhNTXpYRUNnWUVBL2luVlZJTlFoVGVEV0l3c2ppOXJDNE55MUlrRXB2K1FxUUFIc0pxdk15anV3NmdsSFA5bQp1U2JBU1NpTzh5VnU1OGF2UUxUS01ZdHlGYm9tdzFQcmRmVmVLUjl3ZXFDSGUxbE9GcVl6SzV6TEttelZUeXRnCmxCY0FXcjAxanBMeXpwS29ybmpEYzR0dE1TdlBZTm1ISXh4SWhiSDNHU2QwbW9qazU5UEFKcjhDZ1lFQXl2VXgKQ2FoU1VyRUg2N0dWM3djZnByRHd0V1BVcFNEMkF0emlvbjJRcERTMXk5dDUzcE1ZSUdVTkxjWUpMZ0JKQzE2WQozV1FSRmRsSCtEUDdIaEdma1VlRmFMOWcxUUJDZmltWW9ZczZOS1ZCcTRjWVh2QVZTRWc2bGMvc1hHK0R0T1JQCmhBUmRJM0pndVdNaFZjNGI5Vm1Jai92bVQ1MnFFVkVtcHEwRzBVY0NnWUFTVi82WG5PcWcwc0xlRHkvZ0N6Z1UKbXFZZEJNNmJKdkxQMzdxdVdsdXV1NU9QOTRER09RQzIrRDhFaUxMWWhha2RmVStFd2dlZHo4eXFHTWRYYmFVZQozRml4YXgxNUhFRHEvQ1VRcVdva0NhcjRJdWE2VWcwa1l3eVpmL0p2bWRlQVpVRmJaa2ZrL1BraWhXRHdRb0xvClc5QTRKZ0lKaExsN3RjbWZtYjdTalFLQmdDTkI3dy9uYnMyd3RWaUxsQ2FYZlRjZSsrSDNBc1RnOGZ2VFZZZTIKMm42OExXekpwdVUwbG5kaU5xVGlCMHczZm5qOEtRQWsxeGI5bFJRWUs2S3dteERJNVBNcWMrN3N5YUJUSjVIQQp0dzdZT28xS3ZjQVlZd29ZaWh6bWJ3QXIyeXg4a1JlMURsMFBES0NJQ1ExMzdjRjBtVld5QS9PR3h6bVU2R3NDCkdmSVhBb0dCQUx3aWppT3VVOC9qQndkUzlZdndiNG5lNllnWGkwNHhhczBvU0F4bkduUndJWVFaZFlWdjYxRkIKZzVPbFo0bEN3RURtQytjckdVVTYwbTAxbW1qTXlDdW55VWVzVnZ0U050MVRQYVA1NkVyZ1FLcm1DTEF2cnJYKwpidldjMEtIWTkxaFluOWcwcEdWTGdkcjZnc0JUN3JFeVdVclFZM095elNobCt5TytCTkRJCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==";
  process.env.DATABASE_SSL_CERT =
    "LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBMFUzNlhUay9Jc1ZjMy9FcnA0MmJ0bk1VTVBONkdkRExQZ3lOcld5WFd5NU1PdUQ5Cm5tSld4Y3B2SGxiVmpoaTFNTUZObFVzbFlaWGVZSkh5L2tVY2gvNXVhVU0vbUowbzhUZ3R1dXVHdkxrOTVqNDkKM2QwTTVXSm5MQWVqMFdIdnpsQ2lNTnh1Q0JYT2NaVkxrYVNXMm5MUEczSW5wRTdsald0U3BhZ3pZVjRZcHduRwp2aU1FMjdkQzRzWGtwLzlWaW9iTlBGR3BpM3JQemtLcHpvZmFEaHZnQmJQR0djcTN4RUhrK2Rya245aEU2cVhSCm1LTTlwU0F6SEdFY2lWMlo1QmdiZ1U5ZlJUaGRMY2JYcy9MN2t5SjJkYWQ3VEU5QnhtYVFBS3ZRbGRsbFBQbVIKRG1ZclhMRWxHMjV2NkdsMWNvbnUxRHdQQmNkRUFrSmQwSDhhYndJREFRQUJBb0lCQVFETEQ1b2NvNU9MU21zbQpvTFkzb24wMWIwUmhrWFllWWFFdEc4VEFRaUE5eUJjUThJTmVEQTRmYXB5UGxMTXZYdTA2MWU5TkxsQ2Y4bVNDCjBGWXROaVBPRkp4TjUzNWxzK09xMDFRYWlySjNta2hoZm5WTE1GQjRveFZ4ZENBTTNiVm9ObmFFYlBjYlJQeTYKMlpzdE83OVhSQmVHaXlQR2x2ekNUU01yc0puWWxVemI0Q2pGRkN1M3VCdGd2UjVQazRtUXVkMmszWDJaaFBnawpoTWgyNDBnMFZrUVliZjM1ZEs0NG05R1hYSnFZa0FNOHhEZi9uNXlEVDhWeHQvdXgwTHM3ckNnZWk0TXJDUURXCmdheXVBSXJpRHZxUmZJR2ViVXVTUTIvc0JqNmZ6ZW9xVU9DNFFFSlc4Z2tRd3dnRGVpK1VOMlV4eVdJMGU5MzcKbTZlWXZkRVJBb0dCQVAxa1dMdWZmMVViMHkwRUtIUjc0a2FuRWc5dFZmcDhVSVBENzFmM2gwR250SThEY3ZRagpzeVgyUHBrZ0lXUndKekxYbk9DVXpmdjkrb1ZmejU3bXA2N3lwTjZhZ2ZEdGhXL2c0NzZLWVRzMnY0RFAyckUyCi81K2RZTUFsRVcyRGdIV0ZBMVhJN01GVXM4dXNwSS80eCtwK28zWDE2dUFzSSt1U2lkaXR2Y3pyQW9HQkFOTjEKZDVYb3dYWTQ1L0k5MDYwY2puZGVyZGxVVUR2emp3TWVQRjJuZ2xla2dOZG5Yb2hZd2dNVlc5TmhBZVRLYTNrTQpPNUNtZE93NEgvdUFwcnBTSEVsQTVrVWc1VFlrTFlFSkFuMldhMXh6THhzOE8vTjBKcDBRa2lyN3J4WnRTSDQ5Cmt3Y0htQjNJenJkNzNaZXBkODFMNHhXWmJ0TWJoQnVKYVBheEhIZU5Bb0dBQ1lIcFhtaldvei9mQlpKaFhqV0QKd1BqbDBaUmRwSDlqbWY0UkRmRG9yMHIybUdNZHZoRlUySGpMMG4wRkk3cWRqZWZQS0JJTlJJWThEeU1RTERzbApVWWdqTFlNSW14eWVaQnRCRUZZcTNjanBHSkV6K0hCQzJSOVRrUUlUREZQaHp3Y0ZvQU5nOXNRUjF2T01YU2FOCmdidnNzREZnOWJaU1JyV0IzSkp3UzY4Q2dZQXJiZkRGcFN3MnI3RlRtMGNpUXI4djNRNHZtSlZ4K3EvZ29CRWQKMncxMkdwOHJubHRYL1lLN1IyTzRvaS9WWVkxNUt2NEEwMjhvSk03TXhMdDVnT3UyVDlIN1dLbzYyR3RRR1IyZAoxWXJ2VGVqYTJ5QWsvRElDQ0NrOUVydi9DeXJjWXFFVHpJZDlkb1NlUXA1Y1M3NERPQmJIbE4raUZBQ3A5eXJMCm44eU04UUtCZ0Z5SzlUeDMvZjc2anZFYzRuRzM2eStVK3pQYTBQRjlQWWRmc1VPZ29VbnRydnVCZ0lxaHZubWoKekNMWEV2UGw3aXhDK0lMNWF1MllQL0h4bUJsTmlES3Y4YzllUHB0djZPZFRyMGdZaHR6RTNGemRzQ1J1eFY4MwpFYmZlalBoZHJTakR2ZElaS0pEdkIxcmNRR2dwZFB2eFYwMmU0TThUckNacGtMNGxiUWFrCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==";

  let fake_ca = `-----BEGIN CERTIFICATE-----
MIIDazCCAlOgAwIBAgIUCP4V/Bkir/vRTSzMQUNFw7Rl9+MwDQYJKoZIhvcNAQEL
BQAwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM
GEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0yMTA5MzAxNDAyMTZaFw0yNjA5
MjkxNDAyMTZaMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw
HwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQDJgHENceoRx0d2f7Jrit9e13MtHLazbZXn1TGblObo
EkpDPQ+IxRxi1yp74Bl0Gh2zwE39yT5bP+8GdRQ/Ivey8rK8WADA4fXin1nK/lrG
JeDg5R6MS0FKee+dUykY2kiE+z7EN5lVyDcJX+66b9rhj3flXK2AhAGG6WVeJpQ6
1XUnexoJqeYhGO9DadnY6F2HBlpVS2pha20FNYxvWdlWcftwiLo3Jx6XAQjxhsxz
P6sIGr4plTWeCl8NrJ3qgnNAr9mPNdePb4SSW2IUbxgjhm6l8FQ9uunjwAxjhJYD
NsuGFvhFkxQ+vQ0v/Llxn5ESU+KYJ9C9XWwpCrWVZq35AgMBAAGjUzBRMB0GA1Ud
DgQWBBQ50MvGUk5pQlaQ8V7EYUgcHBXr8DAfBgNVHSMEGDAWgBQ50MvGUk5pQlaQ
8V7EYUgcHBXr8DAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQBx
XacqOBsxpW9s5s8dmuW05mG0sXcbKHx1orTnEiGDQnySA61+iWLgDG2AAGdgZm+O
J03E4myNYFoOPnJQMVfbVZgiY9WwXINjHNFdGEcpFLDgjx2Vw1FAj407G5+EV+mk
rrVZ1nm04xQjK8rMEVuu2bs5LLBLzQh8xlR/IUDKV+a7R2WmTEIa2hbV1sxqVTnR
vFcrUA9cWimQ15dpMh9LSltMG/DrRFmgCppMpvObVrQVTY3io7wRfy9lxRmZMQeM
OAk39w73M6pu0/3M/Bjrs8hMdlyY2JVBf97bAm/N7gTrHorAWIct/Bw5cr3Ffa6+
lnD4PKV8HV+A73V/82+M
-----END CERTIFICATE-----
`;
  let fake_key = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAyYBxDXHqEcdHdn+ya4rfXtdzLRy2s22V59Uxm5Tm6BJKQz0P
iMUcYtcqe+AZdBods8BN/ck+Wz/vBnUUPyL3svKyvFgAwOH14p9Zyv5axiXg4OUe
jEtBSnnvnVMpGNpIhPs+xDeZVcg3CV/uum/a4Y935VytgIQBhullXiaUOtV1J3sa
CanmIRjvQ2nZ2OhdhwZaVUtqYWttBTWMb1nZVnH7cIi6NycelwEI8YbMcz+rCBq+
KZU1ngpfDayd6oJzQK/ZjzXXj2+EkltiFG8YI4ZupfBUPbrp48AMY4SWAzbLhhb4
RZMUPr0NL/y5cZ+RElPimCfQvV1sKQq1lWat+QIDAQABAoIBAD6cloRi/SSBE4eS
rlIUWMwTjkpaPbsLNiVPbZa2cflylXjHJGiPNv7PdPgA7mfRJaGRA6r0OVgJSbBr
+NqVdvo3x6oWfkVw8QJ2GWSmHHatlm7LQu69A5CsyvPLv11lllsb5qj5zb+F8vQK
xxdPYmfsOIkgfxkL652MMF9NBYox86a8/xNChfy0qIudNnhNOsr2pGOP8i6f5hUr
KqoR/sLcschv6TkowCt23svidYAlx9HHOM15uLg+aLawWVvHtdyIQU5iLorNDaTD
z3YmNojtS7EkeZL0efrPkZLQHeqh1MI+AZ8DVEA1DkGUhdlVhfS8AAhdDmlotkDV
r8MMzXECgYEA/inVVINQhTeDWIwsji9rC4Ny1IkEpv+QqQAHsJqvMyjuw6glHP9m
uSbASSiO8yVu58avQLTKMYtyFbomw1PrdfVeKR9weqCHe1lOFqYzK5zLKmzVTytg
lBcAWr01jpLyzpKornjDc4ttMSvPYNmHIxxIhbH3GSd0mojk59PAJr8CgYEAyvUx
CahSUrEH67GV3wcfprDwtWPUpSD2Atzion2QpDS1y9t53pMYIGUNLcYJLgBJC16Y
3WQRFdlH+DP7HhGfkUeFaL9g1QBCfimYoYs6NKVBq4cYXvAVSEg6lc/sXG+DtORP
hARdI3JguWMhVc4b9VmIj/vmT52qEVEmpq0G0UcCgYASV/6XnOqg0sLeDy/gCzgU
mqYdBM6bJvLP37quWluuu5OP94DGOQC2+D8EiLLYhakdfU+Ewgedz8yqGMdXbaUe
3Fixax15HEDq/CUQqWokCar4Iua6Ug0kYwyZf/JvmdeAZUFbZkfk/PkihWDwQoLo
W9A4JgIJhLl7tcmfmb7SjQKBgCNB7w/nbs2wtViLlCaXfTce++H3AsTg8fvTVYe2
2n68LWzJpuU0lndiNqTiB0w3fnj8KQAk1xb9lRQYK6KwmxDI5PMqc+7syaBTJ5HA
tw7YOo1KvcAYYwoYihzmbwAr2yx8kRe1Dl0PDKCICQ137cF0mVWyA/OGxzmU6GsC
GfIXAoGBALwijiOuU8/jBwdS9Yvwb4ne6YgXi04xas0oSAxnGnRwIYQZdYVv61FB
g5OlZ4lCwEDmC+crGUU60m01mmjMyCunyUesVvtSNt1TPaP56ErgQKrmCLAvrrX+
bvWc0KHY91hYn9g0pGVLgdr6gsBT7rEyWUrQY3OyzShl+yO+BNDI
-----END RSA PRIVATE KEY-----
`;

  /// this is not a real certificate signed by the CA, it's fake
  let fake_cert = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0U36XTk/IsVc3/Erp42btnMUMPN6GdDLPgyNrWyXWy5MOuD9
nmJWxcpvHlbVjhi1MMFNlUslYZXeYJHy/kUch/5uaUM/mJ0o8TgtuuuGvLk95j49
3d0M5WJnLAej0WHvzlCiMNxuCBXOcZVLkaSW2nLPG3InpE7ljWtSpagzYV4YpwnG
viME27dC4sXkp/9ViobNPFGpi3rPzkKpzofaDhvgBbPGGcq3xEHk+drkn9hE6qXR
mKM9pSAzHGEciV2Z5BgbgU9fRThdLcbXs/L7kyJ2dad7TE9BxmaQAKvQldllPPmR
DmYrXLElG25v6Gl1conu1DwPBcdEAkJd0H8abwIDAQABAoIBAQDLD5oco5OLSmsm
oLY3on01b0RhkXYeYaEtG8TAQiA9yBcQ8INeDA4fapyPlLMvXu061e9NLlCf8mSC
0FYtNiPOFJxN535ls+Oq01QairJ3mkhhfnVLMFB4oxVxdCAM3bVoNnaEbPcbRPy6
2ZstO79XRBeGiyPGlvzCTSMrsJnYlUzb4CjFFCu3uBtgvR5Pk4mQud2k3X2ZhPgk
hMh240g0VkQYbf35dK44m9GXXJqYkAM8xDf/n5yDT8Vxt/ux0Ls7rCgei4MrCQDW
gayuAIriDvqRfIGebUuSQ2/sBj6fzeoqUOC4QEJW8gkQwwgDei+UN2UxyWI0e937
m6eYvdERAoGBAP1kWLuff1Ub0y0EKHR74kanEg9tVfp8UIPD71f3h0GntI8DcvQj
syX2PpkgIWRwJzLXnOCUzfv9+oVfz57mp67ypN6agfDthW/g476KYTs2v4DP2rE2
/5+dYMAlEW2DgHWFA1XI7MFUs8uspI/4x+p+o3X16uAsI+uSiditvczrAoGBANN1
d5XowXY45/I9060cjnderdlUUDvzjwMePF2nglekgNdnXohYwgMVW9NhAeTKa3kM
O5CmdOw4H/uAprpSHElA5kUg5TYkLYEJAn2Wa1xzLxs8O/N0Jp0Qkir7rxZtSH49
kwcHmB3Izrd73Zepd81L4xWZbtMbhBuJaPaxHHeNAoGACYHpXmjWoz/fBZJhXjWD
wPjl0ZRdpH9jmf4RDfDor0r2mGMdvhFU2HjL0n0FI7qdjefPKBINRIY8DyMQLDsl
UYgjLYMImxyeZBtBEFYq3cjpGJEz+HBC2R9TkQITDFPhzwcFoANg9sQR1vOMXSaN
gbvssDFg9bZSRrWB3JJwS68CgYArbfDFpSw2r7FTm0ciQr8v3Q4vmJVx+q/goBEd
2w12Gp8rnltX/YK7R2O4oi/VYY15Kv4A028oJM7MxLt5gOu2T9H7WKo62GtQGR2d
1YrvTeja2yAk/DICCCk9Erv/CyrcYqETzId9doSeQp5cS74DOBbHlN+iFACp9yrL
n8yM8QKBgFyK9Tx3/f76jvEc4nG36y+U+zPa0PF9PYdfsUOgoUntrvuBgIqhvnmj
zCLXEvPl7ixC+IL5au2YP/HxmBlNiDKv8c9ePptv6OdTr0gYhtzE3FzdsCRuxV83
EbfejPhdrSjDvdIZKJDvB1rcQGgpdPvxV02e4M8TrCZpkL4lbQak
-----END RSA PRIVATE KEY-----
`;

  let provider = new SqlProvider(`regtest ${Math.random()}`);
  let c = provider.getConfig();
  expect(c.ssl.rejectUnauthorized).toBe(false);
  expect(c.ssl.ca).toBe(fake_ca);
  expect(c.ssl.key).toBe(fake_key);
  expect(c.ssl.cert).toMatch(fake_cert);
});

test("Should default to rejectUnauthorized false if not exactly false", async () => {
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = "False";

  let provider = new SqlProvider(`regtest ${Math.random()}`);
  let c = provider.getConfig();
  expect(c.ssl.rejectUnauthorized).toBe(true);
});

test("Should default to rejectUnauthorized when undefined", async () => {
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = undefined;

  let provider = new SqlProvider(`regtest ${Math.random()}`);
  let c = provider.getConfig();
  expect(c.ssl.rejectUnauthorized).toBe(true);
});

test("Should default to rejectUnauthorized when non-existent", async () => {
  delete process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
  let provider = new SqlProvider(`regtest ${Math.random()}`);
  let c = provider.getConfig();
  expect(c.ssl.rejectUnauthorized).toBe(true);
});

test("Should not have ssl property when unconfigured", async () => {
  delete process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
  delete process.env.DATABASE_SSL_CA;
  delete process.env.DATABASE_SSL_KEY;
  delete process.env.DATABASE_SSL_CERT;
  let provider = new SqlProvider(`regtest ${Math.random()}`);
  let c = provider.getConfig();
  expect(c.ssl).toBe(undefined);
});

test("Store and retrieve faucet queue items", async () => {
  let db = new SqlProvider(`testnet ${Math.random()}`);
  await db.init();
  await db.addFaucetQueueItem("0x00", "", "0x0a");
  await db.addFaucetQueueItem("0x01", "", "0x0b");

  await db.beginTransaction();
  const items = await db.getFaucetQueue();
  expect(items.length).toBe(2);
  expect(items[0].address).toBe("0x00");
  expect(items[0].token).toBe("");
  expect(items[0].value).toBe("0x0a");
  await db.deleteFaucetQueueItems(items);
  await db.commitTransaction();

  const newItems = await db.getFaucetQueue();
  expect(newItems.length).toBe(0);

  db.close();
});
