(function () {
  "use strict";

  var Console = /** @class */ (function () {
    function Console() {
      this.error = function (txt) {
        this.log(txt, "ERROR!");
      };
      this.textarea = document.createElement("textarea");
    }
    Console.prototype.log = function (txt, type) {
      if (type) this.textarea.value += type + " ";
      this.textarea.value += txt + "\n";
    };
    return Console;
  })();

  const hexArray = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
  ];
  const reduceToHex = (s, c) => s + hexArray[c >>> 4] + hexArray[c & 0x0f];
  const u8toHex = function (u8) {
    return u8.reduce(reduceToHex, "");
  };

  var __awaiter =
    (undefined && undefined.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P
          ? value
          : new P(function (resolve) {
              resolve(value);
            });
      }
      return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done
            ? resolve(result.value)
            : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
  var __generator =
    (undefined && undefined.__generator) ||
    function (thisArg, body) {
      var _ = {
          label: 0,
          sent: function () {
            if (t[0] & 1) throw t[1];
            return t[1];
          },
          trys: [],
          ops: [],
        },
        f,
        y,
        t,
        g;
      return (
        (g = { next: verb(0), throw: verb(1), return: verb(2) }),
        typeof Symbol === "function" &&
          (g[Symbol.iterator] = function () {
            return this;
          }),
        g
      );
      function verb(n) {
        return function (v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_)
          try {
            if (
              ((f = 1),
              y &&
                (t =
                  op[0] & 2
                    ? y["return"]
                    : op[0]
                    ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                    : y.next) &&
                !(t = t.call(y, op[1])).done)
            )
              return t;
            if (((y = 0), t)) op = [op[0] & 2, t.value];
            switch (op[0]) {
              case 0:
              case 1:
                t = op;
                break;
              case 4:
                _.label++;
                return { value: op[1], done: false };
              case 5:
                _.label++;
                y = op[1];
                op = [0];
                continue;
              case 7:
                op = _.ops.pop();
                _.trys.pop();
                continue;
              default:
                if (
                  !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                  (op[0] === 6 || op[0] === 2)
                ) {
                  _ = 0;
                  continue;
                }
                if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                  _.label = op[1];
                  break;
                }
                if (op[0] === 6 && _.label < t[1]) {
                  _.label = t[1];
                  t = op;
                  break;
                }
                if (t && _.label < t[2]) {
                  _.label = t[2];
                  _.ops.push(op);
                  break;
                }
                if (t[2]) _.ops.pop();
                _.trys.pop();
                continue;
            }
            op = body.call(thisArg, _);
          } catch (e) {
            op = [6, e];
            y = 0;
          } finally {
            f = t = 0;
          }
        if (op[0] & 5) throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
      }
    };
  var console = new Console();
  document.addEventListener("DOMContentLoaded", function () {
    return __awaiter(this, void 0, void 0, function () {
      var wallet;
      return __generator(this, function (_a) {
        //
        // Bootstrapping
        //
        // Initialize our Console widget - it will log browser window.
        document.getElementById("consoleArea").appendChild(console.textarea);
        // Test it:
        console.log(
          "Hello! Import a wallet with Wallet Import Format, generate a new one."
        );
        let setWifButton, generateButton, sendButton, balanceButton;
        try {
          if (window) {
            let alice = new mainnet.TestnetWallet();
            setWifButton = document.getElementById("setWif");

            setWifButton.onclick = function () {
              const wif = document.getElementById("wif").value;
              console.log("Generating");
              alice
                .fromWIF(wif)
                .then(() => {
                  console.log("Wif:      " + alice.privateKeyWif);
                  console.log("cashaddr: " + alice.cashaddr);
                })
                .catch((error) => {
                  console.log(error);
                });
            };
            generateButton = document.getElementById("generate");
            generateButton.onclick = function () {
              console.log("Generating");
              alice
                .generateWif()
                .then(() => {
                  console.log("WIF:      " + alice.privateKeyWif);
                  console.log("cashaddr: " + alice.cashaddr);
                })
                .catch((error) => {
                  console.log(error);
                });
            };
            sendButton = document.getElementById("send");
            sendButton.onclick = function () {
              console.log("Sending...");
              const amount = document.getElementById("amount").value;
              const toAddress = document.getElementById("toAddress").value;
              const sendRequest = [[toAddress, [amount, "satoshi"]]];
              alice
                .send(sendRequest)
                .then((resp) => {
                  for (const t of resp) {
                    let txnHash = t.slice();
                    txnHash.reverse();
                    console.log(
                      "Success! transaction hash is: " + u8toHex(txnHash)
                    );
                  }
                })
                .catch((error) => {
                  console.log(error);
                });
            };
            balanceButton = document.getElementById("balance");
            balanceButton.onclick = function () {
              alice
                .getBalance(alice.cashaddr)
                .then((resp) => {
                  console.log("Balance:  " + resp + " satoshi");
                })
                .catch((error) => {
                  console.log(error);
                });
            };
          } else {
            console.log("This thread doesn't seem to have a window");
          }
        } catch (ex) {
          console.error(ex);
        }
        return [2 /*return*/];
      });
    });
  });
})();
