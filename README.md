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
- run `node ./setup.js` to create a root ACL at http://localhost:3000/.acl which gives https://solidtestsuite.solidcommunity.net/profile/card#me full read/write/control access.
- run `node ./fetch.js` to check that the ACL is configured correctly.
* advanced test (uses the same root ACL doc, but from bash): `bash ./run-against-css.sh`

You can also cut-and-paste the lines from run-against-css.sh into your bash shell, then you can more easily run tests interactively.