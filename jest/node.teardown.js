const child_process = require("child_process");

module.exports = async function () {
  // Stop bchd
  global.bchDaemon.stdio.forEach((s) => s.pause());

  // Windows doesn't respect a *nix kill signal
  if (process.platform === "win32") {
    child_process.exec("taskkill /pid " + global.bchDaemon.pid + " /T /F");
  } else {
    global.bchDaemon.kill();
  }
  console.log("stopped bchd");

  // Kill the api server
  global.mainnetServer.stdio.forEach((s) => s.pause());

  // Windows doesn't respect a *nix kill signal
  if (process.platform === "win32") {
    child_process.exec("taskkill /pid " + global.mainnetServer.pid + " /T /F");
  } else {
    global.mainnetServer.kill();
  }

  console.log("stopped express");
};
