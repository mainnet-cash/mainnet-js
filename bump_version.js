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

// update package.json
let package = require("./package.json");
let version = package.version;
console.log("Package version:", version);

let newVersion = undefined;

if (semver.valid(process.argv[2])) {
  newVersion = process.argv[2];
} else {
  let bumpType = types.includes(process.argv[2]) ? process.argv[2] : "patch";
  let preType = process.argv[3];
  newVersion = semver.inc(package.version, bumpType, preType);
}

console.log("Updating to version:", newVersion);
package.main = package.main.replace(version, newVersion);
package.version = newVersion;

fs.writeFileSync("./package.json", JSON.stringify(package, null, 2));

swag = ["./swagger/v1/api.yml", "./generated/serve/api/openapi.yaml"];

swag.forEach((val) => {
  fs.writeFileSync(
    val,
    fs
      .readFileSync(val, "utf8")
      .replace(/  version: .*/g, `  version: ${newVersion}`)
  );
});
