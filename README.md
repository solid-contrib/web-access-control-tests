# WAC Tests
Surface tests for CRUD and Websockets-pubsub functionality of a pod server

## Usage
### In development
Start your server with a self-signed cert on port 443 of localhost (for node-solid-server, make sure to set `ACL_CACHE_TIME=5`) and run `sh ./example.sh`.

### Against CSS
In one terminal window:
* check out the https://github.com/solid/community-server repo locally, and run `npm ci; npm run build`
* find the function `isRSAPublicJWK(x)` in node_modules/@solid/dist/identity-token-verifier/dist/guards/DPoPJWKGuard.js and add `x.alg = 'RS256'` at the top of that function, to work around a bug in NSS v5.6.4, caused by https://github.com/solid/oidc-op/issues/29.
* ./bin/server.js -l debug

In another terminal window:
* check out this repo from https://github.com/solid/web-access-control-tests and run `npm ci`
* check out the `run-against-css` branch
* simple test (sets a root ACL doc from node and reads it back):
- run `node ./setup.js http://localhost:3000/.acl` to create a root ACL at http://localhost:3000/.acl which gives https://solidtestsuite.solidcommunity.net/profile/card#me full read/write/control access.
- run `node ./fetch.js http://localhost:3000/.acl` to check that Alice ('solidtestsuite') can access it.
- run `node ./fetch-bob.js http://localhost:3000/.acl` to check that Bob ('solid-crud-tests-example-2') can *not* access it.
* advanced test (uses the same root ACL doc, but from bash): `bash ./run-against-css.sh`

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
