const semver = require("semver");
const fs = require("fs");

const types = [
  "major",
  "premajor",
  "minor",
  "preminor",
  "patch",
  "prepatch",
  "prerelease",
];

let newVersion = undefined;

let rootPackageFile = "./package.json";

// update package.json
const workspacePackageFiles = [
  "./packages/mainnet-js/package.json",
  "./packages/contract/package.json",
  "./packages/indexeddb-storage/package.json",
  "./packages/postgresql-storage/package.json",
  "./packages/bcmr/package.json",
  "./packages/mainnet-cash/package.json",
];
const workspacePackages = [
  "mainnet-js",
  "@mainnet-cash/contract",
  "@mainnet-cash/indexeddb-storage",
  "@mainnet-cash/postgresql-storage",
  "@mainnet-cash/bcmr",
];

// Get the package version from the root package

let rootPackage = require(rootPackageFile);
let version = rootPackage.version;
console.log("Old root package version:", version);

if (semver.valid(process.argv[2])) {
  newVersion = process.argv[2];
} else {
  let bumpType = types.includes(process.argv[2]) ? process.argv[2] : "patch";
  let preType = process.argv[3];
  newVersion = semver.inc(rootPackage.version, bumpType, preType);
}
console.log("New root package version:", newVersion);

function updatePackageFile(file) {
  let pckg = require(file);
  pckg.version = newVersion;
  console.log(`Updated ${pckg.name} to version: ${newVersion}`);

  for (const p of workspacePackages) {
    if (p in pckg.dependencies) {
      pckg.dependencies[p] = newVersion;
      console.log(`Updated ${pckg.name}.dependency ${p} to ${newVersion}`);
    }
    if (pckg.devDependencies && p in pckg.devDependencies) {
      pckg.dependencies[p] = newVersion;
      console.log(`Updated ${pckg.name}.dependency ${p} to ${newVersion}`);
    }
  }

  fs.writeFileSync(file, JSON.stringify(pckg, null, 2) + "\n");
}

updatePackageFile(rootPackageFile);

workspacePackageFiles.forEach((file) => {
  updatePackageFile(file);
});

// update the openapi and the express copy
const swag = [
  "./swagger/v1/api.yml",
  "./packages/mainnet-cash/api/openapi.yaml",
];
swag.forEach((val) => {
  fs.writeFileSync(
    val,
    fs
      .readFileSync(val, "utf8")
      .replace(/  version: \d+\.\d+\.\d+.*/g, `  version: ${newVersion}`)
  );
  console.log(`Updated ${val} to ${newVersion}`);
});
