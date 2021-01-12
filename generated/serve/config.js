const path = require('path');
const os = require('os');

const config = {
  ROOT_DIR: __dirname,
  URL_PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  URL_PATH: process.env.URL_PATH ? process.env.URL_PATH : "http://localhost",
  TIMEOUT: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 60,
  WORKERS: process.env.WORKERS ? parseInt(process.env.WORKERS) : 10,
  BASE_VERSION: '',
  CONTROLLER_DIRECTORY: path.join(__dirname, 'controllers'),
  PROJECT_DIR: __dirname,
  FAUCET_CASHADDR: "bchtest:qzxkd5achtj6v46m9vdqv6gj2pvrac5q0qd2qqa2ga",
  FAUCET_WIF: "cQp32f2zYoKFG65Hq6WhYeYqJAFhoumDK7Vy792f1qJ55u71ZGUJ",
  FAUCET_SLP_CASHADDR: "slptest:qr2n0w9q752l25zhpgchn096xt8d23kz9gw3j5a7vv",
  FAUCET_SLP_WIF: "cPxmU6njbsiWd8uz6S8JjfcfhndyZbaeL6yYhXCRiHmXY3wLVJgG"
};
config.OPENAPI_YAML = path.join(config.ROOT_DIR, 'api', 'openapi.yaml');
config.DOC_YAML = path.join(config.ROOT_DIR, "../../swagger/v1/", "api.yml");
config.FULL_PATH = `${config.URL_PATH}:${config.URL_PORT}/${config.BASE_VERSION}`;
config.FILE_UPLOAD_PATH = path.join(config.PROJECT_DIR, 'uploaded_files');

module.exports = config;
