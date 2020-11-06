import { generateTestFolder } from '../helpers/env';
import { getAuthFetcher } from 'solid-auth-fetcher';

const ALICE_WEBID = process.env.ALICE_WEBID;

// jest.setTimeout(30000);

describe('Create', () => {
  let authFetcherAlice;
  let authFetcherBob;
  
  const { testFolderUrl } = generateTestFolder();
  beforeEach(async () => {
    authFetcherAlice = await getAuthFetcher('alice');
    authFetcherBob = await getAuthFetcher('bob');
    // FIXME: NSS ACL cache,
    // wait for ACL cache to clear:
    await new Promise(resolve => setTimeout(resolve, 20));
  });

  afterEach(() => {
    return recursiveDelete(testFolderUrl, authFetcherAlice);
  });

  describe('Using POST', () => {
    it(`Is allowed with accessTo Append access`, async () => {
      const containerUrl = `${testFolderUrl}accessToAppend/`;
      // This will do mkdir-p:
      await authFetcherAlice.fetch(`${containerUrl}/test.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await findAclDocUrl(containerUrl, authFetcherAlice);
      await authFetcherAlice.fetch(aclDocUrl, {
        method: 'PUT',
        // FIXME: leave Alice with Control, but give only Append to Bob:
        // body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Append.\n`,
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Append, acl:Control.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      const result = await authFetcherAlice.fetch(`${testFolderUrl}accessToAppend/`, {
        method: 'POST',
        body: 'hello'
      });
      expect(result.status).toEqual(201);
    });
    it(`Is allowed with accessTo Write access`, async () => {
      const containerUrl = `${testFolderUrl}accessToWrite/`;
      // This will do mkdir-p:
      await authFetcherAlice.fetch(`${containerUrl}/test.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await findAclDocUrl(containerUrl, authFetcherAlice);
      await authFetcherAlice.fetch(aclDocUrl, {
        method: 'PUT',
        // FIXME: leave Alice with Control, but give only Write to Bob:
        // body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Write.\n`,
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Write, acl:Control.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      const result = await authFetcherBob.fetch(`${testFolderUrl}accessToWrite/`, {
        method: 'POST',
        body: 'hello'
      });
      expect(result.status).toEqual(201);
    });
    it(`Is disallowed otherwise`, async () => {
      const containerUrl = `${testFolderUrl}allOtherModes/`;
      // This will do mkdir-p:
      await authFetcherAlice.fetch(`${containerUrl}/test.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await findAclDocUrl(containerUrl, authFetcherAlice);
      await authFetcherAlice.fetch(aclDocUrl, {
        method: 'PUT',
        // FIXME: leave Alice with Control, but give only Write to Bob:
        // body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Write.\n`,
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#one> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Read, acl:Control.\n<#two> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:default <${containerUrl}>;\n  acl:mode acl:Read, acl:Append, acl:Write, acl:Control.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      const result = await authFetcherAlice.fetch(`${containerUrl}/`, {
        method: 'POST',
        body: 'hello'
      });
      expect(result.status).toEqual(403);
    });
  });

  describe('Using PUT', () => {
    it(`Is allowed with accessTo and default Write access`, async () => {
      const containerUrl = `${testFolderUrl}accessToAndDefaultWrite/`;
      // This will do mkdir-p:
      await authFetcherAlice.fetch(`${containerUrl}/test.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await findAclDocUrl(containerUrl, authFetcherAlice);
      await authFetcherAlice.fetch(aclDocUrl, {
        method: 'PUT',
        // FIXME: leave Alice with Control, but give only Append to Bob:
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:default <${containerUrl}>;\n  acl:mode acl:Write, acl:Control.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      const result = await authFetcherBob.fetch(`${containerUrl}/new.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      expect(result.status).toEqual(201);
    });
    it(`requires default Write`, async () => {
      const containerUrl = `${testFolderUrl}allOtherModes/`;
      // This will do mkdir-p:
      await authFetcherAlice.fetch(`${containerUrl}/test.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await findAclDocUrl(containerUrl, authFetcherAlice);
      await authFetcherAlice.fetch(aclDocUrl, {
        method: 'PUT',
        // FIXME: leave Alice with Control, but give only Write to Bob:
        // body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Write.\n`,
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#one> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Read, acl:Append, acl:Write, acl:Control.\n<#two> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:default <${containerUrl}>;\n  acl:mode acl:Read, acl:Append, acl:Control.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      const result = await authFetcherBob.fetch(`${containerUrl}/new.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      expect(result.status).toEqual(403);
    });

    it(`requires accessTo Write`, async () => {
      const containerUrl = `${testFolderUrl}allOtherModes/`;
      // This will do mkdir-p:
      await authFetcherAlice.fetch(`${containerUrl}/test.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await findAclDocUrl(containerUrl, authFetcherAlice);
      await authFetcherAlice.fetch(aclDocUrl, {
        method: 'PUT',
        // FIXME: leave Alice with Control, but give only Write to Bob:
        // body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Write.\n`,
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#one> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Read, acl:Append, acl:Control.\n<#two> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:default <${containerUrl}>;\n  acl:mode acl:Read, acl:Append, acl:Write, acl:Control.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      const result = await authFetcherBob.fetch(`${containerUrl}/new.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      expect(result.status).toEqual(403);
    });

  });
});
