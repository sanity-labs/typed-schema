---
'@sanity-labs/typed-schema': minor
---

Curate the public API and unify the asset document shapes.

Now exported, as the README already described: `rename`, `required`, `deepRequired`, `shallowPartial`, `shallowRequired`, `strictMode`, `safeStrictMode`, `StrictModeError`, `never`, `portableText`, `createLoader`.

No longer exported:

- the demo loader stub (`loadDocument`, `loadReference`, ... that always rejected); build your own with `createLoader(fetchImpl)`
- the experimental form layer (`defineForm` and its types), which moved out of the package
- `pickDeep` (unfinished), the per-type `parseXxx` sub-parsers, built-in shape constants (`documentBase`, `IMAGE_ASSET`, ...) and internal helper types (`AZ`, `Digits`, `ValidFieldChars`, ...)

`RequiredShape` was exported under one name for two different types; it is now `ShallowRequiredShape` and `DeepRequiredShape`.

`imageAsset()` and `fileAsset()` return the same definitions the `image()`/`file()` asset references use. Their shape now reflects what Sanity stores: `palette`, `lqip`, `blurHash` and `uploadId` are optional, `metadata.location` and `altText` exist, and `Infer<ReturnType<typeof imageAsset>>` includes all asset fields.
