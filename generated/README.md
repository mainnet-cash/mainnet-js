# WARNING - changes will be overwritten

Any changes made to files contained in this directory **will be overwritten**
when the commit is pushed to github, unless the file is added to 
the .openapi-generator-ignore file of the sub-project.

## Updating the API

To change the API, make the appropriate change in [API the specification](../swagger/v1/api.yml).  

Any changes in the specification will be detected in CI, validated and reflected in generated code contained in this folder.

## Adding/updating server logic

The express services are implemented in the [express](../express) folder and imported into the generated server by [overriding generated services](services/index.ts). So if a new service is added, it must be added to `services/index.ts` to appear on the nodejs endpoint. 

## Building typescript-express-server locally

To get typings on the express server, the javascript templates and java generator were added to a separate 
docker image: `docker://2qxx/openapi-generator:ts`

Within this container, the server may be generated with the following command:

    generate -i swagger/v1/api.yml -g typescript-express-server -o generated/serve

A github action is also available at `2qx/codegen-docker-action@v1`