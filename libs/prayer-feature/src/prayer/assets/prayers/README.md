# Prayer Content Schema

Prayer assets are stored as arrays of `PrayerBlock` objects in JSON files. The TypeScript types live in `libs/prayer-feature/src/prayer/types/prayer.ts`.

- `type`: one of `heading`, `paragraph`, `instruction`, or `conditional`.
- `content`: display text for the block. For `conditional` blocks this is a nested array of `PrayerBlock`.
- `role`: optional speaker identifier. Allowed values are `priest`, `deacon`, `choir`, `people`.
- `timestamp_minutes`: optional number counting minutes from the start of the service.
- `is_major_section`: optional flag marking the first block of a major section.
- `condition`: present only on `conditional` blocks. Includes `{ "rule": "..." }` and optional `{ "negate": true }`.
  Supported rules are `ordinary`, `pascha_period`, `pascha_bright_week`, `pascha_to_ascension`, and `ascension_to_trinity`.

Example:

```json
{
  "type": "heading",
  "content": "Проскомидия",
  "role": "priest",
  "is_major_section": true,
  "timestamp_minutes": 0
}
```

Conditional blocks wrap their own sequence:

```json
{
  "type": "conditional",
  "condition": { "rule": "pascha_to_ascension" },
  "content": [
    { "type": "paragraph", "content": "Христос воскресе…", "role": "choir" }
  ]
}
```

When rendering, role metadata enables per-speaker styling, while `timestamp_minutes` and `is_major_section` drive the service map and progress indicators.

## Completeness checklist

- Ensure each service enumerates every major milestone with the first block in that segment carrying `is_major_section: true`.
- Provide a valid `role` for any spoken, sung, or instructional line so speaker styling remains accurate.
- Keep `timestamp_minutes` non-decreasing throughout the file and include them on all major sections (adding them to intermediate blocks is strongly encouraged).
- Gate Pascha-specific variations with the supported liturgical rules and avoid introducing other rule identifiers without schema updates.
- Verify the JSON matches the structures defined in `libs/prayer-feature/src/prayer/types/prayer.ts` before committing.
- Remember that conditional content only contributes to rendered indices when its rule evaluates to `true` for the chosen evaluation date; align structural assumptions accordingly.
