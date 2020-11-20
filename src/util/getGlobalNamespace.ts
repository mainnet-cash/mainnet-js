

export function getGlobalNamespace() {

  var isNode = false;
  if (typeof process === 'object') {
    if (typeof process.versions === 'object') {
      if (typeof process.versions.node !== 'undefined') {
        return process
      }
    }
  } else if (typeof window === 'object') {
    return window
  } else if (typeof self === 'object') {
    return self
  } 
  throw Error("Could not determine global namespace")
}