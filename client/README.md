This project uses codegen to generate thin-client libraries for the api. These libraries
handle the boilerplate of connecting to the server for you.

## Clients

| language         | Examples | Tests | Native Signing |
| :--------------- | :------: | :---: | :------------: |
| mainnet-node     |    ⍰     |   ⍰   |       👍       |
| mainnet-browser  |    ⍰     |   ⍰   |       ⍰        |
| mainnet-worker   |    ⍰     |   ⍰   |       ⍰        |
| android          |    -     |   -   |       -        |
| cpp-restsdk      |    -     |   -   |       -        |
| csharp           |    -     |   -   |       -        |
| go               |    -     |   -   |       -        |
| java             |    -     |   -   |       -        |
| javascript       |    -     |   -   |       -        |
| php              |    -     |   -   |       -        |
| python           |    -     |   -   |       -        |
| ruby             |    -     |   -   |       -        |
| rust             |    -     |   -   |       -        |
| swift            |    -     |   -   |       -        |
| typescript-dummy |    -     |   ⍰   |       -        |

## New clients in other new languages

A list of available clients can be generated with the command:

    npm run codegen:list

## Building a proxy

If your site needs to obtain some data from requests prior to passing them to the API, you may generate code for a proxy using codegen and pass those requests to your self hosted
