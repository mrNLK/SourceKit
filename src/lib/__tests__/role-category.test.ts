import { describe, it, expect } from "vitest";
import { deriveRoleCategory } from "@/lib/role-category";
describe("deriveRoleCategory", () => {
  it("prefers a short job title", () => expect(deriveRoleCategory("Staff ML Engineer", "x")).toBe("Staff ML Engineer"));
  it("extracts a short role from a long query", () => {
    const c = deriveRoleCategory("", "Senior ML infrastructure engineers with CUDA, Triton and distributed training experience at frontier labs who have shipped large-scale systems");
    expect(c).toBe("Senior ML Infrastructure Engineer");
  });
  it("falls back to General", () => expect(deriveRoleCategory("", "")).toBe("General"));
  it("caps length", () => expect(deriveRoleCategory("", "a b c d e f g h i j k l m n o p q r s t u v w x y z aa bb cc dd ee ff gg hh ii").length).toBeLessThanOrEqual(48));
});
