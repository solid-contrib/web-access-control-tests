const fetch = require('node-fetch');
const { getAuthFetcher, getNodeSolidServerCookie } = require('solid-auth-fetcher');

const oidcIssuer = 'https://solidcommunity.net';
const nssUsername = 'solid-crud-tests-example-2';
const nssPassword = '123';
const origin = 'https://tester';

async function run(url) {
  console.log('Getting cookie', { oidcIssuer, nssUsername, nssPassword });
  const cookie = await getNodeSolidServerCookie(oidcIssuer, nssUsername, nssPassword);
  console.log('Getting fetcher', { oidcIssuer, cookie, origin });
  const fetcher = await getAuthFetcher(oidcIssuer, cookie, origin);
  console.log('Fetching', { url });
  const result = await fetcher.fetch(url);
  console.log(result.status, await result.text());
  for (let pair of result.headers.entries()) {
     console.log(`Response header: ${pair[0]}: ${pair[1]}`);
  }
}

// ...
run(process.argv[2]);
