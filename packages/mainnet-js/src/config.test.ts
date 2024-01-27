import { Config } from "./config.js";
import { wordlist as czech } from '@scure/bip39/wordlists/czech';
import { wordlist as english } from '@scure/bip39/wordlists/english';
import { wordlist as french } from '@scure/bip39/wordlists/french';
import { wordlist as italian } from '@scure/bip39/wordlists/italian';
import { wordlist as japanese } from '@scure/bip39/wordlists/japanese';
import { wordlist as korean } from '@scure/bip39/wordlists/korean';
import { wordlist as portuguese } from '@scure/bip39/wordlists/portuguese';
import { wordlist as simplifiedChinese } from '@scure/bip39/wordlists/simplified-chinese';
import { wordlist as spanish } from '@scure/bip39/wordlists/spanish';
import { wordlist as traditionalChinese } from '@scure/bip39/wordlists/traditional-chinese';

test("Should get the default wordlist", () => {
    expect(Config.getWordlist().shift()).toBe("abandon")
    expect(Config.getWordlist().shift()).toBe("abandon")
    expect(Config.getWordlist().pop()).toBe("zoo")
    expect(Config.getWordlist().pop()).toBe("zoo")
});

test("Should get the default wordlist", () => {
    Config.setWordlist(czech)
    expect(Config.getWordlist().shift()).toBe("abdikace")
    expect(Config.getWordlist().pop()).toBe("zvyk")
});


test("Expect Error setting a bad wordlist to the config", async () => {
    expect.assertions(1);
    try {
        let badList = [...english]
        badList.pop()
        expect(Config.setWordlist(badList))
    } catch (e: any) {
        expect(e.message).toBe(
            "Setting a custom word list is not allowed"
        );
    }
});

test("Should get the default wordlist", () => {


    Config.setWordlist(czech)
    expect(Config.getWordlist().shift()).toBe("abdikace")
    Config.setWordlist(english)
    expect(Config.getWordlist().shift()).toBe("abandon")
    Config.setWordlist(french)
    expect(Config.getWordlist().shift()).toBe("abaisser")
    Config.setWordlist(italian)
    expect(Config.getWordlist().shift()).toBe("abaco")
    Config.setWordlist(japanese)
    expect(Config.getWordlist().shift()).toBe("あいこくしん")
    Config.setWordlist(korean)
    expect(Config.getWordlist().shift()).toBe("가격")
    Config.setWordlist(portuguese)
    expect(Config.getWordlist().shift()).toBe("abacate")
    Config.setWordlist(simplifiedChinese)
    expect(Config.getWordlist().shift()).toBe("的")
    Config.setWordlist(spanish)
    expect(Config.getWordlist().shift()).toBe("ábaco")
    Config.setWordlist(traditionalChinese)
    expect(Config.getWordlist().shift()).toBe("的")
});