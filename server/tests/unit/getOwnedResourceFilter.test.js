import { describe, expect, it } from "vitest";

import { getOwnedResourceFilter } from "../../src/utils/getOwnedResourceFilter.js";

describe("getOwnedResourceFilter", () => {
  it("scopes a resource lookup to its authenticated owner", () => {
    expect(getOwnedResourceFilter("resource-1", "user-1")).toEqual({
      _id: "resource-1",
      userId: "user-1",
    });
  });
});
