import { space } from "rdf-namespaces";
import { SolidLogic } from 'solid-logic';
import { sym } from 'rdflib'
import { getSolidLogicInstance, WEBID_ALICE } from '../helpers/env';

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
