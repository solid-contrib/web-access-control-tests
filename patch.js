const fetch = require('node-fetch');
const { getAuthFetcher, getNodeSolidServerCookie } = require('solid-auth-fetcher');

const oidcIssuer = 'https://solidcommunity.net';
const nssUsername = 'solidtestsuite';
const nssPassword = 'Testing123';
const origin = 'https://tester';

async function run(url) {
  console.log('Getting cookie', { oidcIssuer, nssUsername, nssPassword });
  const cookie = await getNodeSolidServerCookie(oidcIssuer, nssUsername, nssPassword);
  console.log('Getting fetcher', { oidcIssuer, cookie, origin });
  const fetcher = await getAuthFetcher(oidcIssuer, cookie, origin);
  console.log('Fetching', { url });
  const result = await fetcher.fetch(url, {
    method: 'PATCH',
    headers: {
      "Content-Type": "text/n3",
    },
    body:
    "@prefix solid: <http://www.w3.org/ns/solid/terms#>." +
    "#patch a solid:InsertDeletePatch;" +
    "  solid:inserts { <#patch> <#to> <#create> .}.",
  });
  console.log(result.status, await result.text());
}

// ...
run(process.argv[2]);