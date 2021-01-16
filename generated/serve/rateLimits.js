const rateLimit = require("express-rate-limit");

function setupRateLimits(app) {
  if (process.env.JEST_WORKER_ID !== undefined)
    return;
  const message = '{"message":"Too many requests, please try again later","code":419}'
  // 1 per 15 minutes from the same ip
  const limiter1p15mIP = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1,
    message: message
  });
  app.use("/faucet/get_testnet_*/", limiter1p15mIP);

  // 20 per minute from all
  const limiter20pm = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
    message: message,
    keyGenerator: () => "faucet_20pm"
  });
  app.use("/faucet/get_testnet_*/", limiter20pm);

  // 50 per hour from all
  const limiter50ph = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: message,
    keyGenerator: () => "faucet_50ph"
  });
  app.use("/faucet/get_testnet_*/", limiter50ph);
}

module.exports = setupRateLimits;