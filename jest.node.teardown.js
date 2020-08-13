module.exports = async function () {
    // stop bchd
    global.bchDaemon.stdio.forEach(s => s.pause());
    global.bchDaemon.kill();
    console.log("stopped bchd")
  };