const map = {};

const _fetch = global.fetch;

global.fetch = ((uri: any, ...rest: any) => {
  if (!map[uri]) {
    return _fetch(uri, ...rest);
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

export function setupFetchMock(mockUrl, responseData) {
  map[mockUrl] = responseData;
}

export function removeFetchMock(mockUrl) {
  delete map[mockUrl];
}
