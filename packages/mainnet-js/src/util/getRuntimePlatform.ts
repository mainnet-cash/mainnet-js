export enum RuntimePlatform {
  node = "node",
  browser = "browser",
  webworker = "webworker",
}

export function getRuntimePlatform(): RuntimePlatform {
  // https://github.com/foo123/asynchronous.js/blob/master/asynchronous.js
  if (
    "undefined" !== typeof global &&
    ("[object global]" === toString.call(global) ||
      "[object Object]" === toString.call(global))
  ) {
    return RuntimePlatform.node;
  } else {
    if (
      "undefined" !== typeof WorkerGlobalScope &&
      "function" === typeof importScripts &&
      navigator instanceof WorkerNavigator
    ) {
      return RuntimePlatform.webworker;
    } else if (
      "undefined" !== typeof navigator &&
      "undefined" !== typeof document
    ) {
      return RuntimePlatform.browser;
    } else {
      throw Error("Could not determine runtime platform");
    }
  }
}
