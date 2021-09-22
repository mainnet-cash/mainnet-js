import { btoa, atob } from "./base64";
test("atob should decode a browser encoded string in node", async () => {
  let encodedScript =
    "Y29udHJhY3QgVHJhbnNmZXJXaXRoVGltZW91dChieXRlczIwIHNlbmRlclBraCwgYnl0ZXMyMCByZWNpcGllbnRQa2gsIGludCB0aW1lb3V0KSB7CiAgICAgICAgZnVuY3Rpb24gdHJhbnNmZXIocHVia2V5IHNpZ25pbmdQaywgc2lnIHMpIHsKICAgICAgICAgIHJlcXVpcmUoaGFzaDE2MChzaWduaW5nUGspID09IHJlY2lwaWVudFBraCk7CiAgICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICAgIH0KICAKICAgICAgICBmdW5jdGlvbiB0aW1lb3V0KHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgICAgIHJlcXVpcmUoaGFzaDE2MChzaWduaW5nUGspID09IHNlbmRlclBraCk7CiAgICAgICAgICAgIHJlcXVpcmUoY2hlY2tTaWcocywgc2lnbmluZ1BrKSk7CiAgICAgICAgICAgIHJlcXVpcmUodHgudGltZSA+PSB0aW1lb3V0KTsKICAgICAgICB9CiAgICB9";
  let decodedScript = atob(encodedScript);
  let script = `contract TransferWithTimeout(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
        function transfer(pubkey signingPk, sig s) {
          require(hash160(signingPk) == recipientPkh);
          require(checkSig(s, signingPk));
        }
  
        function timeout(pubkey signingPk, sig s) {
            require(hash160(signingPk) == senderPkh);
            require(checkSig(s, signingPk));
            require(tx.time >= timeout);
        }
    }`;
  expect(decodedScript).toBe(script);
});

test("btoa should encode a string in node identical to browser", async () => {
  let browserEncoded =
    "Y29udHJhY3QgVHJhbnNmZXJXaXRoVGltZW91dChieXRlczIwIHNlbmRlclBraCwgYnl0ZXMyMCByZWNpcGllbnRQa2gsIGludCB0aW1lb3V0KSB7CiAgICAgICAgZnVuY3Rpb24gdHJhbnNmZXIocHVia2V5IHNpZ25pbmdQaywgc2lnIHMpIHsKICAgICAgICAgIHJlcXVpcmUoaGFzaDE2MChzaWduaW5nUGspID09IHJlY2lwaWVudFBraCk7CiAgICAgICAgICByZXF1aXJlKGNoZWNrU2lnKHMsIHNpZ25pbmdQaykpOwogICAgICAgIH0KICAKICAgICAgICBmdW5jdGlvbiB0aW1lb3V0KHB1YmtleSBzaWduaW5nUGssIHNpZyBzKSB7CiAgICAgICAgICAgIHJlcXVpcmUoaGFzaDE2MChzaWduaW5nUGspID09IHNlbmRlclBraCk7CiAgICAgICAgICAgIHJlcXVpcmUoY2hlY2tTaWcocywgc2lnbmluZ1BrKSk7CiAgICAgICAgICAgIHJlcXVpcmUodHgudGltZSA+PSB0aW1lb3V0KTsKICAgICAgICB9CiAgICB9";

  let script = `contract TransferWithTimeout(bytes20 senderPkh, bytes20 recipientPkh, int timeout) {
        function transfer(pubkey signingPk, sig s) {
          require(hash160(signingPk) == recipientPkh);
          require(checkSig(s, signingPk));
        }
  
        function timeout(pubkey signingPk, sig s) {
            require(hash160(signingPk) == senderPkh);
            require(checkSig(s, signingPk));
            require(tx.time >= timeout);
        }
    }`;
  let encodedScript = btoa(script);
  expect(encodedScript).toBe(browserEncoded);
});
