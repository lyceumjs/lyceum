# H5P fixture: `lyceum-demo.h5p`

One minimal, deterministic H5P **Multiple Choice** package (FR-009). Committed so smoke runs and
the dev host never touch the network for content (FR-010).

## Provenance

Built by [`../scripts/build-fixture.mjs`](../scripts/build-fixture.mjs) (run it to regenerate —
that script is the only thing here that uses the network):

- **Libraries**: official releases fetched from the public H5P Hub
  (`https://api.h5p.org/v1/content-types/H5P.MultiChoice`): `H5P.MultiChoice 1.16` and its
  dependencies (`H5P.Question`, `H5P.JoubelUI`, `H5P.Transition`, `H5P.FontIcons`, `H5P.Image`,
  `FontAwesome`). Each library carries its own license metadata (MIT) in its `library.json` —
  copyright belongs to Joubel/H5P Group and the respective authors.
- **Content** (`content/content.json`, `h5p.json` title): written by us for this fixture, one
  multiple-choice question with a fixed answer order. Dedicated to the public domain (CC0 1.0).
  The `license` field inside `h5p.json` uses the H5P metadata enum value `U` for validator
  compatibility; this README is the actual license statement.
- The third-party demo content and image that ship with the Hub package were removed.
