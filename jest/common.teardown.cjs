const child_process = require("child_process");

module.exports = async function (cwd) {
  if (cwd instanceof Object || cwd === undefined) {
    cwd = ".";
  }

  if (process.env.SKIP_REGTEST_INIT) {
    return;
  }

  // Stop regtest server
  child_process.spawnSync("./jest/docker/stop.sh", null, {
    shell: false,
    stdio: "inherit",
    cwd: cwd,
  });
  console.log("stopped regtest node");
};
