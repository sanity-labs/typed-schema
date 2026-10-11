---
'@sanity-labs/typed-schema': patch
---

A custom creator can now pass a generic element schema to `array()` without a cast. Constrain the type parameter as `SanityObjectLikeKind | SanityObjectUnionKind | SanityPrimitive | SanityPrimitiveUnion`, and `array()` returns `SanityArray<T>`. If the constraint uses `SanityObjectLike` or `SanityObjectUnion` instead, recursive schemas declared with getters can't infer their type when they use the creator.
