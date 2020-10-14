import { amountInSatoshi } from "./amountInSatoshi";
import { bchParam } from "../chain";
import { getUsdRate } from "./getUsdRate";

test("Get price of Bch, BCH, bch in sat", async () => {
    let rate = await amountInSatoshi(1, 'Bch');
    expect(rate).toBe(BigInt(bchParam.subUnits));
    rate = await amountInSatoshi(1, 'BCH');
    expect(rate).toBe(BigInt(bchParam.subUnits));
    rate = await amountInSatoshi(1, 'bch');
    expect(rate).toBe(BigInt(bchParam.subUnits));
});

test("Get price of sat(s)", async () => {
    let rate = await amountInSatoshi(1, 'sat');
    expect(rate).toBe(1n);
    rate = await amountInSatoshi(1, 'sats');
    expect(rate).toBe(1n);
    rate = await amountInSatoshi(1, 'Satoshi');
    expect(rate).toBe(1n);
    rate = await amountInSatoshi(1, 'SATOSHIS');
    expect(rate).toBe(1n);
});


test("Get price of USD, Usd, usd", async () => {
    let usdRate = await getUsdRate()
    let rate = await amountInSatoshi(usdRate-10, 'USD');
    expect(rate).toBeLessThan(BigInt(bchParam.subUnits));
    rate = await amountInSatoshi(usdRate-10, 'Usd');
    expect(rate).toBeLessThan(BigInt(bchParam.subUnits));
    rate = await amountInSatoshi(usdRate-10, 'usd');
    expect(rate).toBeLessThan(BigInt(bchParam.subUnits));
});
