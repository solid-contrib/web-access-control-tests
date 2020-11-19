import { generateTestFolder, getSolidLogicInstance } from '../helpers/env';
import { SolidLogic } from '../../solid-logic-move-me';

const WEBID_ALICE = process.env.WEBID_ALICE;
const WEBID_BOB = process.env.WEBID_BOB;

// jest.setTimeout(30000);

function makeBody(accessToModes: string, defaultModes: string, publicAccessToModes: string, publicDefaultModes: string, target: string) {
  let str = [
    '@prefix acl: <http://www.w3.org/ns/auth/acl#>.',
    '@prefix  foaf:  <http://xmlns.com/foaf/0.1/>.',
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
  if (publicAccessToModes) {
    str += [
      '<#bobAccessTo> a acl:Authorization;',
      `  acl:agentClass foaf:Agent;`,
      `  acl:accessTo <${target}>;`,
      `  acl:mode ${accessToModes}.`,
      ''
    ].join('\n')
  }

  if (publicDefaultModes) {
    str += [
      '<#bobDefault> a acl:Authorization;',
      `  acl:agentClass foaf:Agent;`,
      `  acl:default <${target}>;`,
      `  acl:mode ${defaultModes}.`,
      ''
    ].join('\n')
  }
  return str
}

describe('From accessTo', () => {
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

  describe('Public accessTo Read+Append, Bob accessTo Write', () => {
    beforeAll(async () => {
      const containerUrl = `${testFolderUrl}publicReadBobWrite/`;
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
        body: makeBody('acl:Write', null, 'acl:Read, acl:Append', null, containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
    });
    it(`Shows the correct WAC-Allow header to Bob`, async () => {
      const result = await solidLogicBob.fetch(`${testFolderUrl}accessToAppend/`);
      expect(result.headers.get('WAC-Allow')).toEqual('user="write",public="read append"');
    });
    it(`Shows the correct WAC-Allow header to the public`, async () => {
      const result = await fetch(`${testFolderUrl}accessToAppend/`);
      expect(result.headers.get('WAC-Allow')).toEqual('user="write",public="read append"');
    });
  });
});

describe('From default', () => {
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

  describe('Public accessTo Read+Append, Bob accessTo Write', () => {
    beforeAll(async () => {
      const containerUrl = `${testFolderUrl}publicReadBobWrite/`;
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
        body: makeBody(null, 'acl:Write', null, 'acl:Read, acl:Append', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
    });
    it(`Shows the correct WAC-Allow header to Bob`, async () => {
      const result = await solidLogicBob.fetch(`${testFolderUrl}accessToAppend/test.txt`);
      expect(result.headers.get('WAC-Allow')).toEqual('user="write",public="read append"');
    });
    it(`Shows the correct WAC-Allow header to the public`, async () => {
      const result = await fetch(`${testFolderUrl}accessToAppend/test.txt`);
      expect(result.headers.get('WAC-Allow')).toEqual('user="write",public="read append"');
    });
  });
});
