const child_process = require("child_process");

module.exports = async function () {
  // Stop fulcrum
  global.fulcrumRegtest.stdio.forEach((s) => s.pause());

  // Windows doesn't respect a *nix kill signal
  if (process.platform === "win32") {
    child_process.exec("taskkill /pid " + global.fulcrumRegtest.pid + " /T /F");
  } else {
    child_process.spawnSync("./docker/stop.sh", null, { shell: false });
  }
  console.log("stopped bchn/fulcrum");
};
