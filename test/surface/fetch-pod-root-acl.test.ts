import { space } from "rdf-namespaces";
import { generateTestFolder, getSolidLogicInstance } from '../helpers/env';
import { SolidLogic } from '../../solid-logic-move-me';
import { sym } from 'rdflib'

const WEBID_ALICE = process.env.WEBID_ALICE;

describe("Alice's storage root", () => {
  let solidLogicAlice: SolidLogic;
  let podRoots;

  beforeAll(async () => {
    solidLogicAlice = await getSolidLogicInstance('ALICE')
    await solidLogicAlice.load(sym(WEBID_ALICE).doc())
    podRoots = solidLogicAlice.store.statementsMatching(sym(WEBID_ALICE), sym(space.storage)).map(st => st.object.value);
  });

  test("has an ACL", async () => {
    expect(podRoots.length).toEqual(1);
    const aclDocUrl = await solidLogicAlice.findAclDocUrl(podRoots[0]);
    await solidLogicAlice.load(aclDocUrl);
    expect(solidLogicAlice.store.statementsMatching(undefined, undefined, undefined, sym(aclDocUrl)).length).toBeGreaterThan(0);
  });

});
