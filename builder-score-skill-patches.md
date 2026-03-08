# Builder Score Skill Patches

Apply these edits to the three sourcing skill files. Each section shows the file, the line to find, and the replacement.

---

## 1. candidate-scorer/SKILL.md

### Find (line ~24):
```
- **Candidate list**: From Clay results, Exa Websets, sourcing-dossier pipeline, candidate-signal-enricher output, or manual input. Minimum fields: name, current title, current company. Better: LinkedIn URL, evidence signals, career history.
```

### Replace with:
```
- **Candidate list**: From Clay results, Exa Websets, sourcing-dossier pipeline, candidate-signal-enricher output, or manual input. Minimum fields: name, current title, current company. Better: LinkedIn URL, evidence signals, career history, Builder Score.
- **Builder Score** (optional): If the candidate has a GitHub username, call the `github-code-quality` edge function (via SourceKit's `getCodeQuality(username)`) to get a 0-100 Builder Score with dimension breakdowns (AI Mastery 30%, Build Velocity 20%, Tooling 15%, Testing 10%, Documentation 8%, Community 7%). Integrate the Builder Score as a signal under Technical Signal scoring. A Builder Score of 70+ adds +0.5 to Technical Signal. A score of 40-69 is neutral. Below 40 is a -0.5 penalty. Claude Code usage detection is a strong positive signal for AI-native roles.
```

### Find (line ~93, Technical Signal row):
```
| **Technical Signal** | Verifiable evidence of exceptional technical ability: papers, patents, shipped products, open source, competitive programming | 25% |
```

### Replace with:
```
| **Technical Signal** | Verifiable evidence of exceptional technical ability: papers, patents, shipped products, open source, competitive programming, Builder Score (0-100 from GitHub code analysis) | 25% |
```

---

## 2. candidate-signal-enricher/SKILL.md

### Find (line ~47, GitHub/Open Source row):
```
| 3 | **GitHub / Open Source** | GitHub, npm, PyPI, crates.io | "[Name]" OR "[known username]" |
```

### Replace with:
```
| 3 | **GitHub / Open Source** | GitHub, npm, PyPI, crates.io, **SourceKit Builder Score** | "[Name]" OR "[known username]". If GitHub username is known, also call `getCodeQuality(username)` for a 0-100 Builder Score with AI Mastery, Build Velocity, Tooling, Testing, Documentation, and Community dimensions. Claude Code usage and AI framework detection are included. |
```

---

## 3. elite-sourcing/SKILL.md

### Find (line ~53-57, enrichments array):
```
  "enrichments": [
    {"description": "LinkedIn profile URL", "format": "url"},
    {"description": "Current job title", "format": "text"},
    {"description": "Current employer / company name", "format": "text"}
  ],
```

### Replace with:
```
  "enrichments": [
    {"description": "LinkedIn profile URL", "format": "url"},
    {"description": "Current job title", "format": "text"},
    {"description": "Current employer / company name", "format": "text"},
    {"description": "GitHub username", "format": "text"}
  ],
```

### Add after Step 3 (Enrich) section, before Step 4:

```
### Step 3b: Builder Score (optional, for technical roles)

For candidates with GitHub usernames from enrichment:
1. Call SourceKit's `getCodeQuality(username)` for each candidate
2. Returns 0-100 Builder Score with dimension breakdowns:
   - AI Mastery (30%): GenAI repo count, AI framework detection, Claude Code usage
   - Build Velocity (20%): Recent commit frequency, repo activity
   - Tooling (15%): CI/CD, linting, dependency management
   - Testing (10%): Test file presence, test frameworks
   - Documentation (8%): README quality, inline docs
   - Community (7%): Stars, forks, contributor count
3. Append Builder Score to candidate data before scoring
4. Flag candidates with Claude Code usage (strong signal for AI-native roles)
```

---

## Applying

These patches need to be applied manually since skill files are read-only from the VM. Open each SKILL.md in your editor and make the replacements above.
