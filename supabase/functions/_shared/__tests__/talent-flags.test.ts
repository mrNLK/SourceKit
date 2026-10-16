import { describe, it, expect } from "vitest";
import { classifyCandidate, classifyPerson, currentExecTitle, isBotAccount, contributionsOf } from "../talent-flags.ts";

// Fixtures mirror a real production search ("senior ML infrastructure engineer, PyTorch, distributed training", 2026-10-15).
const base = { bio: "", stars: 0, recruitable: true };

describe("bots", () => {
  it("detects bot accounts and never labels them gem/ungettable", () => {
    expect(isBotAccount({ username: "pytorchmergebot" })).toBe(true);
    expect(isBotAccount({ username: "dependabot[bot]" })).toBe(true);
    expect(isBotAccount({ username: "x", type: "Bot" })).toBe(true);
    expect(isBotAccount({ username: "abbott" })).toBe(false);
    expect(classifyCandidate({ ...base, username: "pytorchmergebot", followers: 221, score: 2, totalContributions: 5776, recruitable: false }))
      .toEqual({ isBot: true, hiddenGem: false, ungettable: false, ungettableReason: null });
  });
});

describe("ungettable", () => {
  it("does not flag well-known ICs between 500 and 10K followers (was: >=500)", () => {
    expect(classifyCandidate({ ...base, username: "zdevito", followers: 509, score: 77, totalContributions: 734 }).ungettable).toBe(false);
    expect(classifyCandidate({ ...base, username: "ezyang", followers: 3733, score: 82, totalContributions: 3582 }).ungettable).toBe(false);
  });
  it("flags 10K+ followers, current exec titles and AI recruitable=false", () => {
    expect(classifyCandidate({ ...base, username: "soumith", followers: 13723, score: 35 }).ungettableReason).toMatch(/13,723 followers/);
    expect(classifyCandidate({ ...base, username: "a", bio: "Co-founder & CTO at Acme", followers: 10 }).ungettableReason).toMatch(/current Co-founder/i);
    expect(classifyCandidate({ ...base, username: "apaszke", followers: 4075, recruitable: false }).ungettableReason).toBe("AI flagged as unlikely to be recruited");
  });
  it("ignores past roles and 'founding engineer'", () => {
    expect(currentExecTitle("ex-CTO, now IC at Meta")).toBeNull();
    expect(currentExecTitle("Former founder of a meetup; ML engineer")).toBeNull();
    expect(currentExecTitle("Founding engineer at Foo")).toBeNull();
    expect(currentExecTitle("Previously VP Eng, now CEO of Bar")).toBe("CEO");
    expect(currentExecTitle("VP, Infrastructure")).toBe("VP");
  });
});

describe("hidden gem (deterministic)", () => {
  it("strong, relevant, low-visibility contributor", () => {
    expect(classifyCandidate({ ...base, username: "mlazos", followers: 29, score: 80, totalContributions: 689 }).hiddenGem).toBe(true);
    expect(classifyCandidate({ ...base, username: "drisspg", followers: 278, score: 92, totalContributions: 641, stars: 21 }).hiddenGem).toBe(true);
  });
  it("not a gem when followers too high, score too low, or output too small", () => {
    expect(classifyCandidate({ ...base, username: "zou3519", followers: 477, score: 85, totalContributions: 1851 }).hiddenGem).toBe(false);
    expect(classifyCandidate({ ...base, username: "swolchok", followers: 0, score: 65, totalContributions: 674 }).hiddenGem).toBe(false);
    expect(classifyCandidate({ ...base, username: "newbie", followers: 5, score: 90, totalContributions: 12 }).hiddenGem).toBe(false);
  });
  it("own-repo stars can qualify output; ungettable is never a gem", () => {
    expect(classifyCandidate({ ...base, username: "maker", followers: 50, score: 75, totalContributions: 3, stars: 400 }).hiddenGem).toBe(true);
    expect(classifyCandidate({ ...base, username: "f", bio: "Founder, CEO", followers: 50, score: 90, totalContributions: 900 }).hiddenGem).toBe(false);
  });
  it("is stable regardless of the AI's opinion (same input, same output)", () => {
    const c = { ...base, username: "rohan-varma", followers: 406, score: 86, totalContributions: 679 };
    expect(classifyCandidate(c)).toEqual(classifyCandidate({ ...c }));
  });
  it("contributionsOf sums repo commit counts", () => {
    expect(contributionsOf({ "pytorch/pytorch": 615, "pytorch/torchtitan": 26 })).toBe(641);
    expect(contributionsOf(null)).toBe(0);
  });
});

describe("classifyPerson (People Search)", () => {
  it("flags current execs from title/headline but not past roles", () => {
    expect(classifyPerson({ currentTitle: "Co-Founder & CTO", sourcingScore: 80 }).ungettable).toBe(true);
    expect(classifyPerson({ headline: "VP, ML Platform at Acme" }).ungettable).toBe(true);
    expect(classifyPerson({ currentTitle: "Staff ML Engineer", headline: "ex-CTO of a startup" }).ungettable).toBe(false);
    expect(classifyPerson({ currentTitle: "Founding Engineer" }).ungettable).toBe(false);
  });
  it("flags >=10K GitHub followers as ungettable", () => {
    const f = classifyPerson({ currentTitle: "Engineer", githubLogin: "soumith", githubFollowers: 13723, githubPublicRepos: 80 });
    expect(f.ungettable).toBe(true);
    expect(f.ungettableReason).toMatch(/13,723/);
  });
  it("hidden gem needs GitHub evidence: low followers, real repos, decent sourcing score", () => {
    const base = { currentTitle: "ML Infra Engineer", githubLogin: "dev", githubFollowers: 120, githubPublicRepos: 25, sourcingScore: 70 };
    expect(classifyPerson(base).hiddenGem).toBe(true);
    expect(classifyPerson({ ...base, githubFollowers: 300 }).hiddenGem).toBe(false);
    expect(classifyPerson({ ...base, githubPublicRepos: 3 }).hiddenGem).toBe(false);
    expect(classifyPerson({ ...base, sourcingScore: 40 }).hiddenGem).toBe(false);
    expect(classifyPerson({ ...base, githubFollowers: null }).hiddenGem).toBe(false);
    expect(classifyPerson({ currentTitle: "ML Infra Engineer", sourcingScore: 90 }).hiddenGem).toBe(false);
  });
  it("marks bots", () => {
    expect(classifyPerson({ githubLogin: "pytorchmergebot" }).isBot).toBe(true);
    expect(classifyPerson({ githubLogin: "someone", githubType: "Bot" }).isBot).toBe(true);
  });
});
