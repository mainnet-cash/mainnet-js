This project uses codegen to generate thin-client libraries for the api. These libraries
handle the boilerplate of connecting to the server for you.

## New clients in other new languages

To generate clients in a particular language, use the following from ../mainnet-js/ directory

    npm:build:client python-experimental

Docker is required.

## Building a proxy

If your site needs to obtain some data from requests prior to passing them to the API, you may generate code for a proxy using codegen and pass those requests to your self hosted version of the nodejs server contained in this project.
