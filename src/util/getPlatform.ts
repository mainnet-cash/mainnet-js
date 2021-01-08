export enum Platform {
  node = "node",
  browser = "browser",
  webworker = "webworker",
}

export function getPlatform(): Platform {
  // https://github.com/foo123/asynchronous.js/blob/master/asynchronous.js
  if (
    "undefined" !== typeof global &&
    ("[object global]" === toString.call(global) ||
      "[object Object]" === toString.call(global))
  ) {
    return Platform.node;
  } else {
    if (
      "undefined" !== typeof WorkerGlobalScope &&
      "function" === typeof importScripts &&
      navigator instanceof WorkerNavigator
    ) {
      return Platform.webworker;
    } else if (
      "undefined" !== typeof navigator &&
      "undefined" !== typeof document
    ) {
      return Platform.browser;
    } else {
      throw Error("Could not determine runtime platform");
    }
  }
}
