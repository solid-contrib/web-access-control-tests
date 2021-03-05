import { SolidLogic } from 'solid-logic';
import { generateTestFolder, getSolidLogicInstance, WEBID_ALICE, WEBID_BOB } from '../helpers/env';
import { responseCodeGroup } from '../helpers/util'

jest.setTimeout(10000);

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
      const containerUrl = `${testFolderUrl}1/accessToAppend/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const result = await solidLogicBob.fetch(`${testFolderUrl}1/accessToAppend/`, {
        method: 'POST',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain'
        }
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it(`Is allowed with accessTo Write access`, async () => {
      const containerUrl = `${testFolderUrl}2/accessToWrite/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const result = await solidLogicBob.fetch(`${testFolderUrl}2/accessToWrite/`, {
        method: 'POST',
        body: 'hello'
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it(`Is disallowed otherwise`, async () => {
      const containerUrl = `${testFolderUrl}3/allOtherModes/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
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
      const containerUrl = `${testFolderUrl}4/accessToAndDefaultWrite/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
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
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it(`Is allowed with accessTo Append and default Write access`, async () => {
      const containerUrl = `${testFolderUrl}5/accessToAndDefaultWrite/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
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
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    // DISPUTED: https://github.com/solid/specification/issues/246
    it.skip(`is disallowed without default Write`, async () => {
      const containerUrl = `${testFolderUrl}6/allOtherModes/`;
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
        body: makeBody('acl:Read, acl:Append, acl:Write, acl:Control', 'acl:Read, acl:Append, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
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

    // DISPUTED, see https://github.com/solid/specification/issues/236
    it.skip(`is disallowed without accessTo Write or Append`, async () => {
      const containerUrl = `${testFolderUrl}7/allOtherModes/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
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
      const containerUrl = `${testFolderUrl}8/accessToAndDefaultWrite/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}new.txt`, {
        method: 'PATCH',
        body: 'INSERT DATA { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update-single-match'
        }
      });
      expect(responseCodeGroup(result.status)).toEqual('2xx');
    });
    it(`Is allowed with accessTo Append and default Write access`, async () => {
      const containerUrl = `${testFolderUrl}9/accessToAndDefaultWrite/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}new.txt`, {
        method: 'PATCH',
        body: 'INSERT DATA { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update-single-match'
        }
      });
      expect(responseCodeGroup(result.status)).toEqual('2xx');
    });

    // DISPUTED: https://github.com/solid/specification/issues/236#issuecomment-779189646
    it.skip(`is disallowed without default Write`, async () => {
      const containerUrl = `${testFolderUrl}10/allOtherModes/`;
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
        body: makeBody('acl:Read, acl:Append, acl:Write, acl:Control', 'acl:Read, acl:Append, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });


      const result = await solidLogicBob.fetch(`${containerUrl}new.txt`, {
        method: 'PATCH',
        body: 'INSERT DATA { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update-single-match'
        }
      });
      expect(result.status).toEqual(403);
    });

    // DISPUTED, see https://github.com/solid/specification/issues/236
    it.skip(`is disallowed without accessTo Write or Append`, async () => {
      const containerUrl = `${testFolderUrl}11/allOtherModes/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}new.txt`, {
        method: 'PATCH',
        body: 'INSERT DATA { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update-single-match'
        }
      });
      expect(result.status).toEqual(403);
    });

  });

  describe('Using PUT in non-existing container', () => {
    it(`Is allowed with accessTo Write and default Write access`, async () => {
      let containerUrl = `${testFolderUrl}12/accessToAndDefaultWrite/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
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
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it(`Is allowed with accessTo Append and default Write access`, async () => {
      const containerUrl = `${testFolderUrl}13/accessToAndDefaultWrite/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
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
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });

    // DISPUTED: https://github.com/solid/specification/issues/246
    it.skip(`is disallowed without default Write`, async () => {
      const containerUrl = `${testFolderUrl}14/allOtherModes/`;
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
        body: makeBody('acl:Read, acl:Append, acl:Write, acl:Control', 'acl:Read, acl:Append, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
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

    // DISPUTED, see https://github.com/solid/specification/issues/236
    it.skip(`is disallowed without accessTo Write or Append`, async () => {
      const containerUrl = `${testFolderUrl}15/allOtherModes/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
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
      const containerUrl = `${testFolderUrl}16/accessToAndDefaultWrite/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}nested/new.txt`, {
        method: 'PATCH',
        body: 'INSERT DATA { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update-single-match'
        }
      });
      expect(responseCodeGroup(result.status)).toEqual('2xx');
    });
    it(`Is allowed with accessTo Append and default Write access`, async () => {
      const containerUrl = `${testFolderUrl}17/accessToAndDefaultWrite/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}nested/new.txt`, {
        method: 'PATCH',
        body: 'INSERT DATA { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update-single-match'
        }
      });
      expect(responseCodeGroup(result.status)).toEqual('2xx');
    });

    // DISPUTED: https://github.com/solid/specification/issues/236#issuecomment-779189646
    it.skip(`is disallowed without default Write`, async () => {
      const containerUrl = `${testFolderUrl}18/allOtherModes/`;
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
        body: makeBody('acl:Read, acl:Append, acl:Write, acl:Control', 'acl:Read, acl:Append, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}nested/new.txt`, {
        method: 'PATCH',
        body: 'INSERT DATA { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update-single-match'
        }
      });
      expect(result.status).toEqual(403);
    });

    // DISPUTED, see https://github.com/solid/specification/issues/236
    it.skip(`is disallowed without accessTo Write or Append`, async () => {
      const containerUrl = `${testFolderUrl}19/allOtherModes/`;
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
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const result = await solidLogicBob.fetch(`${containerUrl}nested/new.txt`, {
        method: 'PATCH',
        body: 'INSERT DATA { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'application/sparql-update-single-match'
        }
      });
      expect(result.status).toEqual(403);
    });
  });
});
