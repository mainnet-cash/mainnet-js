# Mock Typescript Client

This client is a mock typescript client for testing the API server.

It implements the [mainnet-js API contract](../../../mainnet-js/swagger/v1/api.yml)

## This client exists for testing only.

This client does not have signing or cryptographic functions, for the full version of the typescript
see the [src folder](../../../src/) from the root of the project.

## Updating

The API generator uses a deprecated `http.ClientResponse` which has been renamed to `http.IncomingMessage` in node 8.

For this reason, the `api/` folder has been excluded in `.openapi-generator-ignore`.

Otherwise it should be easily updated with the `codegen:typescript-mock` script.
