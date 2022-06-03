# WAC Tests
Surface tests for CRUD and Websockets-pubsub functionality of a pod server

## Usage
### In development
Start your server with a self-signed cert on port 443 of localhost (for node-solid-server, make sure to set `ACL_CACHE_TIME=5`) and run `sh ./example.sh`.

### Against NSS
In one terminal window:
* cd to your checkout of solid/node-solid-server and `npm install`
* Generate a self-signed certificate with `$ openssl req -outform PEM -keyform PEM -new -x509 -sha256 -newkey rsa:2048 -nodes -keyout ../privkey.pem -days 365 -out ../fullchain.pem
  `
* Install NSS with all the defaults by running `./bin/solid-test init`
* Run this command when working with self-signed certificate `export NODE_TLS_REJECT_UNAUTHORIZED=0`
* Run NSS with `ACL_CACHE_TIME=0 ./bin/solid-test start`
* Open Https://localhost:8443 in your browser 
* Click on Register and create an account for alice
* Set Username and password for new account in `./run-against-nss.sh` configs
In another window:
* cd to your checkout of solid/web-access-control-tests and `npm install`
* Run `./run-against-nss.sh`

You can also cut-and-paste the lines from run-against-nss.sh into your bash shell, then you can more easily run tests interactively.

### Against CSS
In one terminal window:
* check out the https://github.com/solid/community-server repo locally, and run `npm ci; npm run build`
* comment out line 16 of `./node_modules/@solid/access-token-verifier/dist/algorithm/verifySolidAccessTokenIssuer.js` to work around [a bug in NSS](https://github.com/solid/node-solid-server/issues/1609).
* ./bin/server.js -l debug

In another terminal window:
* check out this repo from https://github.com/solid/web-access-control-tests and run `npm ci`
* Run `./run-against-css.sh`

You can also cut-and-paste the lines from run-against-css.sh into your bash shell, then you can more easily run tests interactively.

### Against CSS with local NSS instance as the IDP
If you want to use your NSS on localhost instead of on solidcommunity.net, then:
* Run NSS on localhost, in multi-user mode so you can support both Alice and Bob
* You may need to set up alice.localhost in your /etc/hosts, but on Mac that is automatic.
* Browse to https://localhost:8443/ with Firefox and say you accept the self-signed cert (with Chrome the use of self-signed certs has become harder and harder recently)
* Set up a user, alice / 123, and edit ./fetch.js so that `oidcIssuer = 'https://localhost:8443';`, `nssUsername = 'alice'`, and `nssPassword = '123';`.
* Run CSS with `NODE_TLS_REJECT_UNAUTHORIZED=0 ./bin/server.js -l debug`.
* Run the fetch script with `NODE_TLS_REJECT_UNAUTHORIZED=0` as well, for instance:
```sh
NODE_TLS_REJECT_UNAUTHORIZED=0 node fetch.js http://localhost:3000/404.txt
```
