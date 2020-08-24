
import { logger } from './logger';
import { ExpressServer } from './expressServer'

import { config } from "./config";

let expressServer: any

const launchServer = async () => {
  try {
    expressServer = new ExpressServer(config.URL_PORT, config.OPENAPI_YAML);
    expressServer.launch();
    logger.info('Express server running');
  } catch (error) {
    logger.error('Express Server failure', error.message);
    expressServer.close();
  }
};

launchServer().catch(e => logger.error(e));
