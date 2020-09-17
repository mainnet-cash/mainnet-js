module.exports = async function globalTeardown() {

  // Your global teardown
  global.bchDaemon.stdio.forEach((s) => s.pause());
  global.bchDaemon.kill();
  console.log("stopped bchd");

  global.demoServer.stdio.forEach((s) => s.pause());
  
  global.demoServer.kill();
  console.log("stopped express");
}