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
};
config.OPENAPI_YAML = path.join(config.ROOT_DIR, 'api', 'openapi.yaml');
config.DOC_YAML = path.join(config.ROOT_DIR, "../../swagger/v1/", "api.yml");
config.FULL_PATH = `${config.URL_PATH}:${config.URL_PORT}/${config.BASE_VERSION}`;
config.FILE_UPLOAD_PATH = path.join(config.PROJECT_DIR, 'uploaded_files');

module.exports = config;
