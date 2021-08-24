if (typeof window === "object") {
  const url =
    "https://binaries.soliditylang.org/wasm/soljson-v0.8.7+commit.e28d00a7.js";
  let compiler = undefined;
  const compile_ = async function (input, options) {
    return compiler.compile(input, options);
  };

  const compile = async function (input, options) {
    return new Promise(async (resolve) => {
      if (!compiler) {
        delete window["Module"];
        window["Module"] = undefined;

        const newScript = document.createElement("script");
        newScript.type = "text/javascript";
        newScript.src = url;
        document.getElementsByTagName("head")[0].appendChild(newScript);
        const check = window.setInterval(async () => {
          if (!window["Module"]) {
            return;
          }
          window.clearInterval(check);

          compiler =
            typeof window !== "undefined" && window["Module"]
              ? require("solc/wrapper")(window["Module"])
              : require("solc");

          resolve(await compile_(input, options));
        }, 200);
      } else {
        resolve(await compile_(input, options));
      }
    });
  };

  var solc = {
    compile: compile,
    compile_: compile_,
    compiler: compiler,
    url: url,
  };

  module.exports = solc;
  window.solc = solc;
} else {
  var solc = require("solc");
  module.exports = solc;
}
