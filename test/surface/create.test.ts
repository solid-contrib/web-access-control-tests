import { generateTestFolder, getSolidLogicInstance } from '../helpers/env';
import { SolidLogic } from '../../solid-logic-move-me';

const ALICE_WEBID = process.env.ALICE_WEBID;

// jest.setTimeout(30000);

describe('Create', () => {
  let solidLogicAlice: SolidLogic;
  let solidLogicBob: SolidLogic;
  beforeAll(async () => {
    solidLogicAlice = await getSolidLogicInstance('ALICE')
    solidLogicBob = await getSolidLogicInstance('BOB')
  });
  
  const { testFolderUrl } = generateTestFolder('ALICE');
  beforeEach(async () => {
    // FIXME: NSS ACL cache,
    // wait for ACL cache to clear:
    await new Promise(resolve => setTimeout(resolve, 20));
  });

  afterEach(() => {
    return solidLogicAlice.recursiveDelete(testFolderUrl);
  });

  describe('Using POST', () => {
    it(`Is allowed with accessTo Append access`, async () => {
      const containerUrl = `${testFolderUrl}accessToAppend/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}/test.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        // FIXME: leave Alice with Control, but give only Append to Bob:
        // body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Append.\n`,
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Append, acl:Control.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      const result = await solidLogicAlice.fetch(`${testFolderUrl}accessToAppend/`, {
        method: 'POST',
        body: 'hello'
      });
      expect(result.status).toEqual(201);
    });
    it(`Is allowed with accessTo Write access`, async () => {
      const containerUrl = `${testFolderUrl}accessToWrite/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}/test.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        // FIXME: leave Alice with Control, but give only Write to Bob:
        // body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Write.\n`,
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Write, acl:Control.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      const result = await solidLogicBob.fetch(`${testFolderUrl}accessToWrite/`, {
        method: 'POST',
        body: 'hello'
      });
      expect(result.status).toEqual(201);
    });
    it(`Is disallowed otherwise`, async () => {
      const containerUrl = `${testFolderUrl}allOtherModes/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}/test.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        // FIXME: leave Alice with Control, but give only Write to Bob:
        // body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Write.\n`,
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#one> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Read, acl:Control.\n<#two> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:default <${containerUrl}>;\n  acl:mode acl:Read, acl:Append, acl:Write, acl:Control.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      const result = await solidLogicAlice.fetch(`${containerUrl}/`, {
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
      await solidLogicAlice.fetch(`${containerUrl}/test.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        // FIXME: leave Alice with Control, but give only Append to Bob:
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:default <${containerUrl}>;\n  acl:mode acl:Write, acl:Control.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}/new.txt`, {
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
      await solidLogicAlice.fetch(`${containerUrl}/test.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        // FIXME: leave Alice with Control, but give only Write to Bob:
        // body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Write.\n`,
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#one> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Read, acl:Append, acl:Write, acl:Control.\n<#two> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:default <${containerUrl}>;\n  acl:mode acl:Read, acl:Append, acl:Control.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}/new.txt`, {
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
      await solidLogicAlice.fetch(`${containerUrl}/test.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        // FIXME: leave Alice with Control, but give only Write to Bob:
        // body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Write.\n`,
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#one> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:accessTo <${containerUrl}>;\n  acl:mode acl:Read, acl:Append, acl:Control.\n<#two> a acl:Authorization;\n  acl:agent <${ALICE_WEBID}>;\n  acl:default <${containerUrl}>;\n  acl:mode acl:Read, acl:Append, acl:Write, acl:Control.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}/new.txt`, {
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
