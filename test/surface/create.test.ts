import { generateTestFolder } from '../helpers/global';
import { getAuthFetcher } from '../helpers/obtain-auth-headers';
import { recursiveDelete, findAclDocUrl } from '../helpers/util';

const ALICE_WEBID = process.env.ALICE_WEBID;

// jest.setTimeout(30000);

async function createFixture(mode, predicate, authFetcher, testFolderUrl) {
  const containerUrl = `${testFolderUrl}${predicate}${mode}/`;
  // This will do mkdir-p:
  await authFetcher.fetch(`${containerUrl}/test.txt`, {
    method: 'PUT',
    body: 'hello'
  });
  const aclDocUrl = await findAclDocUrl(containerUrl, authFetcher);
  await authFetcher.fetch(aclDocUrl, {
    method: 'PUT',
    body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:${predicate} <${containerUrl}>;\n  acl:mode acl:${mode}.\n`,
    headers: {
      'Content-Type': 'text/turtle'
    }
  });
}

describe('Create', () => {
  let authFetcher;
  const { testFolderUrl } = generateTestFolder();
  const containerUrl = `${testFolderUrl}empty/`;
  beforeEach(async () => {
    authFetcher = await getAuthFetcher();
    // FIXME: NSS ACL cache,
    // wait for ACL cache to clear:
    await new Promise(resolve => setTimeout(resolve, 20));
  });

  afterEach(() => {
    return recursiveDelete(testFolderUrl, authFetcher);
  });

  describe('Using POST', () => {
    function testFor(mode, predicate, allowed) {
      it(`Is ${allowed ? 'allowed' : 'not allowed'} with ${predicate} ${mode} access`, async () => {
        await createFixture(mode, predicate, authFetcher, testFolderUrl);
        const result = await authFetcher.fetch(`${testFolderUrl}${predicate}${mode}/`, {
          method: 'POST',
          body: 'hello'
        });
        expect(result.status).toEqual((allowed ? 201 : 403));
      });
    }

    testFor('Read', 'accessTo', false);
    testFor('Append', 'accessTo', true);
    testFor('Write', 'accessTo', true);
    testFor('Read', 'accessTo', false);
    // testFor('Read', 'default', false); this one fails on NSS, probably an NSS bug?
    testFor('Append', 'default', false);
    testFor('Write', 'default', false);
    testFor('Read', 'default', false);
  });

  describe('Using PUT', () => {
    function testFor(mode, predicate, allowed) {
      it(`Is ${allowed ? 'allowed' : 'not allowed'} with ${predicate} ${mode} access`, async () => {
        await createFixture(mode, predicate, authFetcher, testFolderUrl);
        const result = await authFetcher.fetch(`${testFolderUrl}${predicate}${mode}/new.txt`, {
          method: 'PUT',
          body: 'hello',
          headers: {
            'Content-Type': 'text/plain',
            'If-None-Match': '*'
          }
        });
        expect(result.status).toEqual((allowed ? 201 : 403));
      });
    }

    testFor('Read', 'accessTo', false);
    testFor('Append', 'accessTo', false);
    testFor('Write', 'accessTo', false);
    testFor('Read', 'accessTo', false);
    testFor('Read', 'default', false);
    testFor('Append', 'default', false);
    testFor('Write', 'default', true);
    testFor('Read', 'default', false);
  });
});
