# Docker image for mainnet REST API server

## Installing docker
Installing docker is as easy as executing the following commands in your terminal:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

## Building the image
To build the image locally run the following command from this directory:
```bash
sudo docker build -t mainnet/mainnet-rest .
```

Alternatively, you can pull the image from the docker hub:
```bash
sudo docker pull mainnet/mainnet-rest
```

## Running the server
There are several scenarios running the server

### Local unsecured
You can run the server locally without https.
It will still be secure since requests coming not from you machine will be refused by the server.

```bash
sudo docker run --rm -p 3000:80 mainnet/mainnet-rest
```

Then you can target your browser or API consumers to http://localhost

### SSL. Secured with letsencrypt
You can alternatively run the server in secure mode with SSL certificates which will be fetched from https://letsencrypt.org

For this you must own a web server with a valid domain name and have root access to it.
This is required by letsencrypt to prove your ownership of the server and its authenticity.

Run the following command to start the container, obtain certificates and run the mainnet API server with SSL enabled.
Note that, You have to pass a contact email and the domain name to the startup script. Here `admin@example.com` and `example.com`
```bash
mkdir -p letsencrypt
sudo docker run --rm -p 80:80 -p 443:443 -v $(pwd)/letsencrypt:/etc/letsencrypt -e LETSENCRYPT_EMAIL=admin@example.com -e DOMAIN=example.com mainnet/mainnet-rest
```

Then you can target your browser or API consumers to https://example.com

Note, that your web server will be visible to the outer world.

### SSL. Own certificates
If you already have certificates to enable SSL for the API server you can place them into `certs` directory:
* your certificate under the name: `fullchain.pem`
* your certificate's private key under the name: `privkey.pem`

Then run your container with the following commands:
```bash
mkdir -p certs
sudo docker run --rm -p 80:80 -p 443:443 -v $(pwd)/certs:/etc/certs mainnet/mainnet-rest
```

#### Generating own self-signed certificate

Run following commands in your terminal:
```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -out certs/fullchain.pem -keyout certs/privkey.pem -nodes -subj '/CN=localhost'
```

Note, that your web server will be visible to the outer world.

## Running docker containers in background
Simply pass the `-d` argument to `docker run` detach from container upon it starting.
E.g. instead of

```bash
sudo docker run ....
```

execute

```bash
sudo docker run -d ....
```

## Database connectivity

Postgresql is required if you plan to use named (persistent) wallets and webhooks. You can either use a postgres docker container or a system-wide postgres installation of your host OS. In mainnet.cash we use `postgres:12-alpine` image. You can refer to our docker configuration used for regression tests located in `jest/regtest-docker-compose.yml`. The configuration is governed by `DATABASE_URL` environment variable.

Example would be:

```bash
sudo docker run -d --env DATABASE_URL=postgres://postgres:trusted@localhost:15432/wallet -p 3000:80 mainnet/mainnet-rest
```

## Webhooks

You can change maximum webhook duration with the `WEBHOOK_EXPIRE_TIMEOUT_SECONDS` environment variable. The default is 86400 seconds which is 24 hours. After this interval the webhook will be removed from DB.