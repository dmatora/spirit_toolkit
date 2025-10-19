# Prayer Content Schema

Prayer assets are stored as arrays of `PrayerBlock` objects in JSON files. The TypeScript types live in `apps/Prayer/src/app/types/prayer.ts`.

- `type`: one of `heading`, `paragraph`, `instruction`, or `conditional`.
- `content`: display text for the block. For `conditional` blocks this is a nested array of `PrayerBlock`.
- `role`: optional speaker identifier. Allowed values are `priest`, `deacon`, `choir`, `people`.
- `timestamp_minutes`: optional number counting minutes from the start of the service.
- `is_major_section`: optional flag marking the first block of a major section.
- `condition`: present only on `conditional` blocks. Currently includes `{ "rule": "pascha_period" }`.

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
  "condition": { "rule": "pascha_period" },
  "content": [
    { "type": "paragraph", "content": "Христос воскресе…", "role": "choir" }
  ]
}
```

When rendering, role metadata enables per-speaker styling, while `timestamp_minutes` and `is_major_section` drive the service map and progress indicators.
