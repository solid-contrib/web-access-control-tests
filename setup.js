const fetch = require('node-fetch');
const { getAuthFetcher, getNodeSolidServerCookie } = require('solid-auth-fetcher');

const oidcIssuer = 'https://solidcommunity.net';
const nssUsername = 'solidtestsuite';
const nssPassword = 'Testing123';
const origin = 'https://tester';
const webId = 'https://solidtestsuite.solidcommunity.net/profile/card#me';

async function run(url) {
  console.log('Getting cookie', { oidcIssuer, nssUsername, nssPassword });
  const cookie = await getNodeSolidServerCookie(oidcIssuer, nssUsername, nssPassword);
  console.log('Getting fetcher', { oidcIssuer, cookie, origin });
  const fetcher = await getAuthFetcher(oidcIssuer, cookie, origin);
  console.log('Fetching', { url });
  const rootAclDoc = '@prefix acl: <http://www.w3.org/ns/auth/acl#>. ' +
    `<#owner> a acl:Authorization ; acl:agent <${webId}> ; ` +
    'acl:accessTo </>; acl:default </>; acl:mode acl:Read, acl:Write, acl:Control .';

  const result = await fetcher.fetch(url, {
    method : 'PUT',
    body: rootAclDoc,
    headers: {
      'Content-Type': 'text/turtle'
    }
  });
  console.log(result.status, await result.text());
}

// ...
run(process.argv[2]);