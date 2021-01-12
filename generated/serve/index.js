const config = require('./config');
const logger = require('./logger');
const ExpressServer = require('./expressServer');
const mainnet = require("mainnet-js");
const launchServer = async () => {
  try {
    this.expressServer = new ExpressServer(config.URL_PORT, config.OPENAPI_YAML, config.DOC_YAML);
    this.expressServer.launch();
    logger.info(`Express server running at ${config.URL_PATH}:${config.URL_PORT}`);
    return this.expressServer;
  } catch (error) {
    logger.error('Express Server failure', error.message, error.stack, error);
    await this.close();
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
  launchServer().catch(e => logger.error(e));
}

module.exports = { startServer , getServer , killElectrum};