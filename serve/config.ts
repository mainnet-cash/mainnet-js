import  path = require('path')
require("dotenv").config({ path: ".env.regtest" });

export let config = {
  ROOT_DIR: __dirname,
  URL_PORT: 3000,
  URL_PATH: 'http://localhost',
  BASE_VERSION: 'v2',
  CONTROLLER_DIRECTORY: path.join(__dirname, 'controllers'),
  PROJECT_DIR: __dirname,
  OPENAPI_YAML: "",
  FULL_PATH: "",
  FILE_UPLOAD_PATH: ""
};

config.OPENAPI_YAML = path.join(config.ROOT_DIR, 'api', 'openapi.yaml');
config.FULL_PATH = `${config.URL_PATH}:${config.URL_PORT}/${config.BASE_VERSION}`;
config.FILE_UPLOAD_PATH = path.join(config.PROJECT_DIR, 'uploaded_files');

