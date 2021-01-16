const child_process = require("child_process");

module.exports = async function () {
  if (process.env.SKIP_REGTEST_INIT) {
    return;
  }

  // Stop regtest server
  global.fulcrumRegtest.stdio.forEach((s) => s.pause());
  child_process.spawnSync(
    "./jest/docker/stop.sh", null,
    {
      cwd: "../../",
      shell: false
    }
  );
  console.log("stopped regtest node");
};
