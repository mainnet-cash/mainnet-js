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
  "./demo/vue3/package.json",
  "./demo/min/package.json",
  "./packages/contract/package.json",
  "./packages/mainnet-cash/package.json",
  "./packages/mainnet-js/package.json",
  "./packages/smartbch/package.json",
];
const workspacePackages = [
  "mainnet-js",
  "@mainnet-cash/smartbch",
  "@mainnet-cash/contract",
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
  let package = require(file);
  package.version = newVersion;
  console.log(`Updated ${package.name} to version: ${newVersion}`);

  if (typeof package.browser !== "undefined") {
    package.browser = package.browser.replace(version, newVersion);
    console.log(`Updated ${package.name}.browser to ${package.browser} `);
  }
  for (const p of workspacePackages) {
    if (p in package.dependencies) {
      package.dependencies[p] = newVersion;
      console.log(`Updated ${package.name}.dependency ${p} to ${newVersion}`);
    }
    if (p in package.devDependencies) {
      package.dependencies[p] = newVersion;
      console.log(`Updated ${package.name}.dependency ${p} to ${newVersion}`);
    }
  }

  fs.writeFileSync(file, JSON.stringify(package, null, 2) + "\n");
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
