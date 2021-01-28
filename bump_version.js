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

// update package.json
const files = ["./package.json", "./generated/serve/package.json"];
files.forEach((file) => {
  let package = require(file);
  let version = package.version;
  console.log("Package version:", version);

  if (semver.valid(process.argv[2])) {
    newVersion = process.argv[2];
  } else {
    let bumpType = types.includes(process.argv[2]) ? process.argv[2] : "patch";
    let preType = process.argv[3];
    newVersion = semver.inc(package.version, bumpType, preType);
  }

  console.log(`Updating ${file} to version: ${newVersion}`);
  package.main = package.main.replace(version, newVersion);
  if (typeof package.browser !== "undefined") {
    package.browser = package.browser.replace(version, newVersion);
  }
  if (package.name === "mainnet-cash") {
    package.dependencies["mainnet-js"] = package.dependencies[
      "mainnet-js"
    ].replace(version, newVersion);
  }
  package.version = newVersion;

  fs.writeFileSync(file, JSON.stringify(package, null, 2) + "\n");
});

const swag = ["./swagger/v1/api.yml", "./generated/serve/api/openapi.yaml"];
swag.forEach((val) => {
  fs.writeFileSync(
    val,
    fs
      .readFileSync(val, "utf8")
      .replace(/  version: .*/g, `  version: ${newVersion}`)
  );
});
