# avoid-ai-writing (vendored skill)

`SKILL.md` is copied verbatim from https://github.com/conorbronsdon/avoid-ai-writing (v3.25.0, MIT license, by Conor Bronsdon).

To update, replace `SKILL.md` with the latest version from the source repo:

```bash
curl -o .claude/skills/avoid-ai-writing/SKILL.md \
  https://raw.githubusercontent.com/conorbronsdon/avoid-ai-writing/main/SKILL.md
```

The skill references optional tooling (`detector/validate.js`, `scripts/check-style.js`, `examples/*.json`) that lives only in the source repo; those extras aren't needed for the skill itself, which is self-contained in `SKILL.md`.
