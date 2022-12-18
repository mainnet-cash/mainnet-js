import axios from "axios";

export function setupAxiosMock(mockUrl, responseData) {
  if (!(axios.interceptors as any).mocks) {
    (axios.interceptors as any).mocks = {};

    // install our interceptors
    (axios.interceptors as any).request.use((config) => {
      const url = config.url!;

      if ((axios.interceptors as any).mocks[url]) {
        // if we have set up a mocked response for this url, cancel the actual request with a cancelToken containing our mocked data
        const mockedResponse = (axios.interceptors as any).mocks[url];
        return {
          ...config,
          cancelToken: new axios.CancelToken((cancel) =>
            cancel({ status: 200, data: mockedResponse } as any)
          ),
        };
      }

      // otherwise proceed with usual request
      return config;
    });

    (axios.interceptors as any).response.use(
      function (response) {
        return response;
      },
      function (error: any) {
        // resolve response with our mocked data
        if (axios.isCancel(error)) {
          return Promise.resolve(error.message);
        }

        // handle all other errors gracefully
        return Promise.reject(error);
      }
    );
  }

  (axios.interceptors as any).mocks[mockUrl] = responseData;
}

export function removeAxiosMock(mockUrl) {
  delete ((axios.interceptors as any).mocks || {})[mockUrl];
}
