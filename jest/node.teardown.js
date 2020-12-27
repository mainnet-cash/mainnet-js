const child_process = require("child_process");

module.exports = async function () {
  if (process.env.SKIP_REGTEST_INIT) {
    return;
  }

  // Stop regtest server
  child_process.spawnSync("./jest/docker/stop.sh", null, {
    shell: false,
    stdio: "inherit",
  });
  console.log("stopped regtest node");
};
