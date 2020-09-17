const { teardown: teardownDevServer } = require('jest-process-manager')

module.exports = async function globalTeardown() {
  await teardownDevServer()
  // Your global teardown
  global.bchDaemon.stdio.forEach((s) => s.pause());
  global.bchDaemon.kill();
  console.log("stopped bchd");

  global.mainnetServer.stdio.forEach((s) => s.pause());
  global.mainnetServer.kill();
  console.log("stopped express");
}