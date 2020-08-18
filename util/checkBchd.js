require("dotenv").config();
const { spawnSync } = require("child_process");

const fs = require("fs");
const path = require("path");
const request = require("request");
const unzipper = require("unzipper");

async function checkBchdBinary() {
  const BIN_DIRECTORY = process.env.BCHD_BIN_DIRECTORY;
  assureDirectoryExists(BIN_DIRECTORY);

  if (
    fs.existsSync(`${BIN_DIRECTORY}/bchd`) &&
    fs.existsSync(`${BIN_DIRECTORY}/bchctl`)
  ) {
    if (!isBchdVersionLatest()) {
      console.log(`updating  bchd to v${process.env.BCHD_LATEST}`);
      await getBchdBinary(BIN_DIRECTORY);
    }
  } else {
    await getBchdBinary(BIN_DIRECTORY);
  }
}

async function getBchdBinary(dir) {
  const platform = getPlatform();
  const arch = getArchitecture();
  const version = `v${process.env.BCHD_LATEST}`;
  const bchdExecutibleDir = `bchd-${platform}_${arch}`;
  const binaryUrl = `https://github.com/gcash/bchd/releases/download/${version}/${bchdExecutibleDir}.zip`;
  const downloadDir = path.resolve(__dirname, `../${dir}`);
  await downloadZipFile(binaryUrl, downloadDir);
  symlinkBchdExecutibles(downloadDir, bchdExecutibleDir, platform);
  symlinkBchdCertificates(downloadDir)
}

function getArchitecture() {
  const architectures = new Map([
    ["x32", "386"],
    ["x64", "amd64"],
    ["arm", "arm"],
  ]);
  if (architectures.has(process.arch)) {
    return architectures.get(process.arch);
  } else {
    throw new Error(
      "Your architecture is not recognized, please download bchd manually and move the unzipped contents to the  ./bin/ folder  "
    );
  }
}

function getPlatform() {
  // TODO not sure about cygwin, or if that should be supported.
  // these maps are given as [nodejsStr, bchdStr]
  const platforms = new Map([
    ["darwin", "darwin"],
    ["freebsd", "freebsd"],
    ["linux", "linux"],
    ["cygwin", "linux"],
    ["openbsd", "openbsd"],
    ["sunos", "solaris"],
    ["win32", "windows"],
  ]);

  if (platforms.has(process.platform)) {
    return platforms.get(process.platform);
  } else {
    throw new Error(
      "Your operating system is not recognized, please download bchd manually and move the unzipped contents to the  ./bin/ folder  "
    );
  }
}

async function downloadZipFile(url, downloadPath) {
  await unzipper.Open.url(request, url).then((d) =>
    d.extract({ path: downloadPath, concurrency: 5 })
  );
}

// As all bch zip files include files in platform specific folders.
// This function creates symlink from the root bin if links don't
// already exist.
function symlinkBchdExecutibles(dir, zipDir, platform) {
  // Get a list of executibles to link specific to the os
  let executibles = ["bchd", "bchctl"].map((b) =>
    platform === "windows" ? b + ".exe" : b
  );
  for (const e of executibles) {
    const binTarget = path.resolve(`${dir}/${zipDir}/${e}`);

    // TODO are file extensions required for symlinks on windows?
    const symlink = path.resolve(`${dir}/${e}`);

    // Don't recreate links if they already exist
    if (!fs.existsSync(symlink)) {
      // Create a symbolic link to the binary.
      fs.symlinkSync(binTarget, symlink);
      // Owner and group have full access, everyone may execute.
      fs.chmodSync(binTarget, 0o775);
    }
  }
}

function symlinkBchdCertificates(dir) {
  // Create links to bchd certificates
  
  for (const e of ['rpc.cert', 'rpc.key']) {
    const bchdhome = getUserHomeFolder()
    const target = path.resolve(`${bchdhome}/.bchd/${e}`);
    const symlink = path.resolve(`${dir}/${e}`);

    // Don't recreate links if they already exist
    if (!fs.existsSync(symlink)) {
      // Create a symbolic link to the binary.
      fs.symlinkSync(target, symlink);
      // Owner and group have full access, everyone may execute.
      fs.chmodSync(target, 0o440);
    }
  }
}

function getUserHomeFolder() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}
// assureDirectoryExists, checks for a dir, and creates it if it doesn't exist
function assureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

// isBchdVersionLatest returns a boolean, true if bchd is up to date according to .env
function isBchdVersionLatest() {
  // Call the version command on the bchd node.
  const bchd = spawnSync(`${process.env.BCHD_BIN_DIRECTORY}/bchd`, [
    `--version`,
  ]);

  // TODO are there two carrage return characters in windows?
  // Get the installed version, removing the charage return.
  const installedVersion = bchd.stdout.toString().slice(0, -1);
  const latestVersion = `bchd version ${process.env.BCHD_LATEST}`;
  return installedVersion === latestVersion;
}

// If there is no window, and there is an object called process, assume nodejs
// WebWorkers and service workers don't have windows or 'process'
if (typeof window === "undefined" && typeof process === "object") {
  checkBchdBinary();
} else {
  console.log("not nodejs");
}
