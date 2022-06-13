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

function makeContainerUrl(testFolderUrl, using, testing) {
  return `${testFolderUrl}using-${using}-test-${testing}/`;
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
    const using = 'POST-in-existing';
    it(`Is allowed with accessTo Append access`, async () => {
      const testing = 'allowed-1';
      const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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
      const result = await solidLogicBob.fetch(containerUrl, {
        method: 'POST',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain'
        }
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it(`Is allowed with accessTo Write access`, async () => {
      const testing = 'allowed-2';
      const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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
      const result = await solidLogicBob.fetch(containerUrl, {
        method: 'POST',
        body: 'hello'
      });
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
    it(`Is disallowed otherwise`, async () => {
      const testing = 'disallowed';
      const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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
    const using = 'PUT-in-existing';
    function testAllowed(accessToPerms, defaultPerms) {
      it(`Is allowed with accessTo ${accessToPerms} and default ${defaultPerms} access`, async () => {
        const testing = `test-allowed-${accessToPerms}-${defaultPerms}`;
        const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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
          body: makeBody(`acl:${accessToPerms}`, `acl:${defaultPerms}`, containerUrl),
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
    }
    testAllowed('Write', 'Write');
    testAllowed('Append', 'Write');

    it(`is disallowed without default Write`, async () => {
      const testing = `test-disallowed-default`;
      const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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

    it(`is disallowed without accessTo Write or Append`, async () => {
      const testing = `test-disallowed-accessTo`;
      const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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
    const using = 'PATCH-in-existing';
    function testAllowed(accessToPerms, defaultPerms) {
      it(`Is allowed with accessTo ${accessToPerms} and default ${defaultPerms} access`, async () => {
        const testing = `test-access-${accessToPerms}-${defaultPerms}`;
        const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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
          body: makeBody(`acl:${accessToPerms}`, `acl:${defaultPerms}`, containerUrl),
          headers: {
            'Content-Type': 'text/turtle',
            // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
          }
        });
        const result = await solidLogicBob.fetch(`${containerUrl}new.txt`, {
          method: 'PATCH',
          headers: {
            "Content-Type": "text/n3",
          },
          body:
          "@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n" +
          "<#patch> a solid:InsertDeletePatch;\n" +
          "  solid:inserts { <#hello> <#linked> <#world> .}.\n",
        });
        expect(responseCodeGroup(result.status)).toEqual('2xx');
      });
    }
    testAllowed('Write', 'Write');
    testAllowed('Append', 'Write');

    it(`is disallowed without default Write`, async () => {
      const testing = `test-disallowed-default`;
      const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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
        headers: {
          "Content-Type": "text/n3",
        },
        body:
        "@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n" +
        "<#patch> a solid:InsertDeletePatch;\n" +
        "  solid:inserts { <#hello> <#linked> <#world> .}.\n",
      });
      expect(result.status).toEqual(403);
    });

    it(`is disallowed without accessTo Write or Append`, async () => {
      const testing = `test-disallowed-accessTo`;
      const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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
        headers: {
          "Content-Type": "text/n3",
        },
        body:
        "@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n" +
        "<#patch> a solid:InsertDeletePatch;\n" +
        "  solid:inserts { <#hello> <#linked> <#world> .}.\n",
      });
      expect(result.status).toEqual(403);
    });

  });

  describe('Using PUT in non-existing container', () => {
    const using = 'PUT-in-non-existing';
    function testAllowed(accessToPerms, defaultPerms) {
      it(`Is allowed with accessTo ${accessToPerms} and default ${defaultPerms} access`, async () => {
        const testing = `test-access-${accessToPerms}-${defaultPerms}`;
        const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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
    }
    testAllowed('Write', 'Write');
    testAllowed('Append', 'Write');

    it(`is disallowed without default Write`, async () => {
      const testing = `disallowed-default`;
      const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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

    it(`is disallowed without accessTo Write or Append`, async () => {
      const testing = `disallowed-accessTo`;
      const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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
    const using = 'PATCH-in-non-existing';
    function testAllowed(accessToPerms, defaultPerms) {
      it(`Is allowed with accessTo ${accessToPerms} and default ${defaultPerms} access`, async () => {
        const testing = `${accessToPerms}-${defaultPerms}`;
        const containerUrl = makeContainerUrl(testFolderUrl, using, testing);

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
          headers: {
            "Content-Type": "text/n3",
          },
          body:
          "@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n" +
          "<#patch> a solid:InsertDeletePatch;\n" +
          "  solid:inserts { <#hello> <#linked> <#world> .}.\n",
        });
        expect(responseCodeGroup(result.status)).toEqual('2xx');
      });
    }
    testAllowed('Write', 'Write');
    testAllowed('Append', 'Write');


    it(`is disallowed without default Write`, async () => {
      const testing = `disallowed-default`;
      const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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
        headers: {
          "Content-Type": "text/n3",
        },
        body:
        "@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n" +
        "<#patch> a solid:InsertDeletePatch;\n" +
        "  solid:inserts { <#hello> <#linked> <#world> .}.\n",
      });
      expect(result.status).toEqual(403);
    });

    it(`is disallowed without accessTo Write or Append`, async () => {
      const testing = `disallowed-default`;
      const containerUrl = makeContainerUrl(testFolderUrl, using, testing);
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
        headers: {
          "Content-Type": "text/n3",
        },
        body:
        "@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n" +
        "<#patch> a solid:InsertDeletePatch;\n" +
        "  solid:inserts { <#hello> <#linked> <#world> .}.\n",
      });
      expect(result.status).toEqual(403);
    });
  });
});
