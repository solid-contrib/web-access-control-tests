import { SolidLogic } from 'solid-logic';
import { generateTestFolder, getSolidLogicInstance, WEBID_ALICE, WEBID_BOB } from '../helpers/env';
import { responseCodeGroup } from '../helpers/util';

jest.setTimeout(10000)

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

describe('Update', () => {
  let solidLogicAlice: SolidLogic;
  let solidLogicBob: SolidLogic;
  beforeAll(async () => {
    solidLogicAlice = await getSolidLogicInstance('ALICE')
    solidLogicBob = await getSolidLogicInstance('BOB')
  });
  
  const { testFolderUrl } = generateTestFolder('ALICE');
  /* beforeEach(async () => {
    // FIXME: NSS ACL cache,
    // wait for ACL cache to clear:
    await new Promise(resolve => setTimeout(resolve, 20));
  }); */

  afterEach(() => {
    // return solidLogicAlice.recursiveDelete(testFolderUrl);
  });

  describe('Using PUT to append', () => {
    it('Is allowed with accessTo Write access on resource', async () => {
      const resourceUrl = `${testFolderUrl}1/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');

      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'text/plain',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello world',
        headers
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it('Is disallowed with accessTo Read+Append+Control access on resource', async () => {
      const resourceUrl = `${testFolderUrl}2/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Read, acl:Append, acl:Control', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'text/plain',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello world',
        headers
      });
	  expect(result.status).toEqual(403);
    });
    it('Is allowed with default Write access on parent', async () => {
      const containerUrl = `${testFolderUrl}3/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Write', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'text/plain',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello world',
        headers
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it('Is disallowed with default Read+Append+Control access on parent', async () => {
      const containerUrl = `${testFolderUrl}4/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Read, acl:Append, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'text/plain',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello world',
        headers
      });
      expect(result.status).toEqual(403);
    });
  });

  describe('Using PUT to overwrite', () => {
    it('Is allowed with accessTo Write access on resource', async () => {
      const resourceUrl = `${testFolderUrl}5/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'text/plain',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PUT',
        body: 'goodbye',
        headers
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it('Is disallowed with accessTo Read+Append+Control access on resource', async () => {
      const resourceUrl = `${testFolderUrl}6/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Read, acl:Append, acl:Control', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'text/plain',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PUT',
        body: 'goodbye',
        headers
      });
      expect(result.status).toEqual(403);
    });
    it('Is allowed with default Write access on parent', async () => {
      const containerUrl = `${testFolderUrl}7/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Write', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'text/plain',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PUT',
        body: 'goodbye',
        headers
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it('Is disallowed with default Read+Append+Control access on parent', async () => {
      const containerUrl = `${testFolderUrl}8/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Read, acl:Append, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'text/plain',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PUT',
        body: 'goodbye',
        headers
      });
      expect(result.status).toEqual(403);
    });
  });

  describe('Using PATCH to append', () => {
    it('Is allowed with accessTo Append access on resource', async () => {
      const resourceUrl = `${testFolderUrl}9/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'application/sparql-update',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'INSERT DATA { <#how> <#are> <#you> . }',
        headers
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
  });
});
    it('Is allowed with accessTo Write access on resource', async () => {
      const resourceUrl = `${testFolderUrl}10/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'application/sparql-update',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'INSERT DATA { <#how> <#are> <#you> . }',
        headers
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it('Is disallowed with accessTo Read+Control access on resource', async () => {
      const resourceUrl = `${testFolderUrl}11/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Read, acl:Control', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'application/sparql-update',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'INSERT DATA { <#how> <#are> <#you> . }',
        headers
      });
      expect(result.status).toEqual(403);
    });
    it('Is allowed with default Append access on parent', async () => {
      const containerUrl = `${testFolderUrl}12/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Append', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'application/sparql-update',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'INSERT DATA { <#how> <#are> <#you> . }',
        headers
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it('Is allowed with default Write access on parent', async () => {
      const containerUrl = `${testFolderUrl}13/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Write', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'application/sparql-update',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'INSERT DATA { <#how> <#are> <#you> . }',
        headers
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it('Is disallowed with default Read+Control access on parent', async () => {
      const containerUrl = `${testFolderUrl}14/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Read, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'application/sparql-update',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'INSERT DATA { <#how> <#are> <#you> . }',
        headers
      });
      expect(result.status).toEqual(403);
    });
  });

  // Read+Write needed following https://github.com/solid/specification/issues/220
  describe('Using PATCH to overwrite', () => {
    it('Is allowed with accessTo Read+Write access on resource', async () => {
      const resourceUrl = `${testFolderUrl}15/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Read, acl:Write', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'DELETE DATA { <#hello> <#linked> <#world> }',
        headers: {
          'Content-Type': 'application/sparql-update'
        }
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it('Is disallowed with accessTo Read+Append+Control access on resource', async () => {
      const resourceUrl = `${testFolderUrl}16/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Read, acl:Append, acl:Control', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'application/sparql-update',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'DELETE DATA { <#hello> <#linked> <#world> . }',
        headers
      });
      expect(result.status).toEqual(403);
    });
    // DISPUTED: This used to require Read access as per https://github.com/solid/specification/issues/220
    // but looks like neither CSS nor ESS implemented it that way.
    it.skip('Is disallowed with accessTo Write+Control access on resource', async () => {
      const resourceUrl = `${testFolderUrl}17/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write, acl:Control', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'application/sparql-update',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'DELETE DATA { <#hello> <#linked> <#world> . }',
        headers
      });
      expect(result.status).toEqual(403);
    });
    it('Is allowed with default Read+Write access on parent', async () => {
      const containerUrl = `${testFolderUrl}18/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Read, acl:Write', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'application/sparql-update',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'DELETE DATA { <#hello> <#linked> <#world> . }',
        headers
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it('Is disallowed with default Read+Append+Control access on parent', async () => {
      const containerUrl = `${testFolderUrl}19/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Read, acl:Append, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'application/sparql-update',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'DELETE DATA { <#hello> <#linked> <#world> . }',
        headers
      });
      expect(result.status).toEqual(403);
    });

    // DISPUTED: This used to require Read access as per https://github.com/solid/specification/issues/220
    // but looks like neither CSS nor ESS implemented it that way.
    it.skip('Is disallowed with default Write+Control access on parent', async () => {
      const containerUrl = `${testFolderUrl}20/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Write, acl:Control', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
      const headers = {
        'Content-Type': 'application/sparql-update',
      };
      if (etagInQuotes) {
        headers['If-Match'] = etagInQuotes
      }
      const result = await solidLogicBob.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'DELETE DATA { <#hello> <#linked> <#world> . }',
        headers
      });
      expect(result.status).toEqual(403);
    });

  });
});
