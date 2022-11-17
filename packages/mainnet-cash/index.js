import config from './config.js';
import logger from './logger.js';
import ExpressServer from './expressServer.js';
import * as mainnet from "mainnet-js";

let expressServer;
const launchServer = async () => {
  try {
    expressServer = new ExpressServer(config.URL_PORT, config.OPENAPI_YAML, config.DOC_YAML);
    expressServer.launch();
    logger.info(`Express server running at ${config.URL_PATH}:${config.URL_PORT}`);
    return expressServer;
  } catch (error) {
    console.trace(error)
    logger.error('Express Server failure', error.message, error.stack, error);
    await expressServer?.close();
  }
};

const getServer = () => {
  let expressServer = new ExpressServer(config.URL_PORT, config.OPENAPI_YAML, config.DOC_YAML);
  return expressServer
}

const  killElectrum =  async () => {
  return mainnet.disconnectProviders()
}

function startServer() {
  launchServer().catch(e => {
    console.trace(e);
    logger.error(e)
  });
}

export default { startServer , getServer , killElectrum};