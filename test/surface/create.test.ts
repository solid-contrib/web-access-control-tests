import { SolidLogic } from 'solid-logic';
import { generateTestFolder, getSolidLogicInstance, WEBID_ALICE, WEBID_BOB } from '../helpers/env';

function makeBody(accessToModes: string, defaultModes: string, target: string) {
  let str = [
    '@prefix acl: <http://www.w3.org/ns/auth/acl#>.',
    '',
    `<#alice> a acl:Authorization;\n  acl:agent <${WEBID_ALICE}>;`,
    `  acl:accessTo <${target}>;`,
    `  acl:default <${target}>;`,
    '  acl:mode acl:Read, acl:Write, acl:Control.',
    ''
  ].join('\n')
  if (accessToModes) {
    str += [
      '<#bobAccessTo> a acl:Authorization;',
      `  acl:agent <${WEBID_BOB}>;`,
      `  acl:accessTo <${target}>;`,
      `  acl:mode ${accessToModes}.`,
      ''
    ].join('\n')
  }
  if (defaultModes) {
    str += [
      '<#bobDefault> a acl:Authorization;',
      `  acl:agent <${WEBID_BOB}>;`,
      `  acl:default <${target}>;`,
      `  acl:mode ${defaultModes}.`,
      ''
    ].join('\n')
  }
  return str
}

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

  describe('Using POST to existing container', () => {
    it(`Is allowed with accessTo Append access`, async () => {
      const containerUrl = `${testFolderUrl}accessToAppend/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Append', null, containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${testFolderUrl}accessToAppend/`, {
        method: 'POST',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain'
        }
      });
      expect(result.status).toEqual(201);
    });
    it(`Is allowed with accessTo Write access`, async () => {
      const containerUrl = `${testFolderUrl}accessToWrite/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', null, containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
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
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Read, acl:Control', 'acl:Read, acl:Append, acl:Write, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(containerUrl, {
        method: 'POST',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain'
        }
      });
      expect(result.status).toEqual(403);
    });
  });

  describe('Using PUT in existing container', () => {
    it(`Is allowed with accessTo Write and default Write access`, async () => {
      const containerUrl = `${testFolderUrl}accessToAndDefaultWrite/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', 'acl:Write', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}new.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      expect(result.status).toEqual(201);
    });
    it(`Is allowed with accessTo Append and default Write access`, async () => {
      const containerUrl = `${testFolderUrl}accessToAndDefaultWrite/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Append', 'acl:Write', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}new.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      expect(result.status).toEqual(201);
    });
    it(`is disallowed without default Write`, async () => {
      const containerUrl = `${testFolderUrl}allOtherModes/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body:  makeBody('acl:Read, acl:Append, acl:Write, acl:Control', 'acl:Read, acl:Append, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}new.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      expect(result.status).toEqual(403);
    });

    it(`is disallowed without accessTo Write or Append`, async () => {
      const containerUrl = `${testFolderUrl}allOtherModes/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body:  makeBody('acl:Read, acl:Control', 'acl:Read, acl:Append, acl:Write, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}new.txt`, {
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

  describe('Using PATCH in existing container', () => {
    it(`Is allowed with accessTo Write and default Write access`, async () => {
      const containerUrl = `${testFolderUrl}accessToAndDefaultWrite/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', 'acl:Write', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}new.txt`, {
        method: 'PATCH',
        body: 'INSERT { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update'
        }
      });
      expect(result.status).toEqual(201);
    });
    it(`Is allowed with accessTo Append and default Write access`, async () => {
      const containerUrl = `${testFolderUrl}accessToAndDefaultWrite/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Append', 'acl:Write', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}new.txt`, {
        method: 'PATCH',
        body: 'INSERT { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update'
        }
      });
      expect(result.status).toEqual(201);
    });
    it(`is disallowed without default Write`, async () => {
      const containerUrl = `${testFolderUrl}allOtherModes/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body:  makeBody('acl:Read, acl:Append, acl:Write, acl:Control', 'acl:Read, acl:Append, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}new.txt`, {
        method: 'PATCH',
        body: 'INSERT { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update'
        }
      });
      expect(result.status).toEqual(403);
    });

    it(`is disallowed without accessTo Write or Append`, async () => {
      const containerUrl = `${testFolderUrl}allOtherModes/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body:  makeBody('acl:Read, acl:Control', 'acl:Read, acl:Append, acl:Write, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}new.txt`, {
        method: 'PATCH',
        body: 'INSERT { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update'
        }
      });
      expect(result.status).toEqual(403);
    });

  });

  describe('Using PUT in non-existing container', () => {
    it(`Is allowed with accessTo Write and default Write access`, async () => {
      let containerUrl = `${testFolderUrl}accessToAndDefaultWrite/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', 'acl:Write', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}nested/new.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      expect(result.status).toEqual(201);
    });
    it(`Is allowed with accessTo Append and default Write access`, async () => {
      const containerUrl = `${testFolderUrl}accessToAndDefaultWrite/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Append', 'acl:Write', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}nested/new.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      expect(result.status).toEqual(201);
    });
    it(`is disallowed without default Write`, async () => {
      const containerUrl = `${testFolderUrl}allOtherModes/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body:  makeBody('acl:Read, acl:Append, acl:Write, acl:Control', 'acl:Read, acl:Append, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}nested/new.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      expect(result.status).toEqual(403);
    });

    it(`is disallowed without accessTo Write or Append`, async () => {
      const containerUrl = `${testFolderUrl}allOtherModes/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body:  makeBody('acl:Read, acl:Control', 'acl:Read, acl:Append, acl:Write, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}nested/new.txt`, {
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

  describe('Using PATCH in non-existing container', () => {
    it(`Is allowed with accessTo Write and default Write access`, async () => {
      const containerUrl = `${testFolderUrl}accessToAndDefaultWrite/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', 'acl:Write', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}nested/new.txt`, {
        method: 'PATCH',
        body: 'INSERT { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update'
        }
      });
      expect(result.status).toEqual(201);
    });
    it(`Is allowed with accessTo Append and default Write access`, async () => {
      const containerUrl = `${testFolderUrl}accessToAndDefaultWrite/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Append', 'acl:Write', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}nested/new.txt`, {
        method: 'PATCH',
        body: 'INSERT { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update'
        }
      });
      expect(result.status).toEqual(201);
    });
    it(`is disallowed without default Write`, async () => {
      const containerUrl = `${testFolderUrl}allOtherModes/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body:  makeBody('acl:Read, acl:Append, acl:Write, acl:Control', 'acl:Read, acl:Append, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}nested/new.txt`, {
        method: 'PATCH',
        body: 'INSERT { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update'
        }
      });
      expect(result.status).toEqual(403);
    });

    it(`is disallowed without accessTo Write or Append`, async () => {
      const containerUrl = `${testFolderUrl}allOtherModes/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body:  makeBody('acl:Read, acl:Control', 'acl:Read, acl:Append, acl:Write, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}nested/new.txt`, {
        method: 'PATCH',
        body: 'INSERT { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update'
        }
      });
      expect(result.status).toEqual(403);
    });

  });
});
