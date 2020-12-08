const child_process = require("child_process");

module.exports = async function () {
  // Stop regtest server
  child_process.spawnSync("./jest/docker/stop.sh", null, {
    shell: false,
    stdio: "inherit",
  });
  console.log("stopped regtest node");
};
