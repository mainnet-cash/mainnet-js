const child_process = require("child_process");

module.exports = async function () {
  // Stop regtest server
  global.fulcrumRegtest.stdio.forEach((s) => s.pause());
  child_process.spawnSync("./jest/docker/stop.sh", null, { shell: false });
  console.log("stopped regtest node");
};
