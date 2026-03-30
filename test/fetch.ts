const map: Record<string, any> = {};

const _fetch = globalThis.fetch;

Object.defineProperty(globalThis, "fetch", {
  writable: true,
});

globalThis.fetch = (async (uri: any, ...rest: any) => {
  if (!map[uri]) {
    // allow for execution of the original fetch taking some time
    const response = await _fetch(uri, ...rest);
    // upon arrival of the response, check if it was mocked in the meanwhile
    if (!map[uri]) {
      return response;
    }
  }

  return new Promise((resolve) =>
    resolve({
      json: () => {
        return typeof map[uri] === "string" ? JSON.parse(map[uri]) : map[uri];
      },
      text: () => {
        return typeof map[uri] === "string"
          ? map[uri]
          : JSON.stringify(map[uri], null, 2);
      },
    })
  );
}) as any;

export function setupFetchMock(mockUrl: string, responseData: any) {
  map[mockUrl] = responseData;
}

export function removeFetchMock(mockUrl: string) {
  delete map[mockUrl];
}
