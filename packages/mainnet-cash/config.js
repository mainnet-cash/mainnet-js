import path from 'path';
import dotenv from "dotenv";

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (process.env.USE_DOTENV || true) {
  dotenv.config({ path: ".env.regtest" });
  dotenv.config({ path: ".env.testnet" });
  dotenv.config({ path: "../../.env.regtest" });
  dotenv.config({ path: "../../.env.testnet" });
}

 const config = {
  ROOT_DIR: __dirname,
  URL_PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  URL_PATH: process.env.URL_PATH ? process.env.URL_PATH : "http://localhost",
  TIMEOUT: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 60,
  WORKERS: process.env.WORKERS ? parseInt(process.env.WORKERS) : 10,
  BASE_VERSION: '',
  CONTROLLER_DIRECTORY: path.join(__dirname, 'controllers'),
  PROJECT_DIR: __dirname,
  FAUCET_CASHADDR: process.env.FAUCET_CASHADDR,
  FAUCET_WIF: process.env.FAUCET_WIF,
  FAUCET_SBCH_ADDRESS: process.env.FAUCET_SBCH_ADDRESS,
  FAUCET_SBCH_PRIVKEY: process.env.FAUCET_SBCH_PRIVKEY,
  FAUCET_SBCH_CONTRACT_ADDRESS: process.env.FAUCET_SBCH_CONTRACT_ADDRESS,
  FAUCET_SBCH_TOKEN_ID: process.env.FAUCET_SBCH_TOKEN_ID,
  API_KEY: process.env.API_KEY
};
config.OPENAPI_YAML = path.join(config.ROOT_DIR, 'api', 'openapi.yaml');
config.DOC_YAML = path.join(config.ROOT_DIR, "../../swagger/v1/", "api.yml");
config.FULL_PATH = `${config.URL_PATH}:${config.URL_PORT}/${config.BASE_VERSION}`;
config.FILE_UPLOAD_PATH = path.join(config.PROJECT_DIR, 'uploaded_files');

export default config