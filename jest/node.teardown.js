module.exports = async function () {
  // stop bchd
  //global.bchDaemon.stdio.forEach((s) => s.pause());
  //global.bchDaemon.kill();
  console.log("stopped bchd");

  global.mainnetServer.stdio.forEach((s) => s.pause());
  global.mainnetServer.kill();
  console.log("stopped express");
};
