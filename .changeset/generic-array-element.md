---
'@sanity-labs/typed-schema': patch
---

A custom creator can now pass a generic element schema to `array()` without a cast. Constrain the type parameter as `ObjectLikeKind | ObjectUnionKind | PrimitiveSchema | PrimitiveUnionSchema`, and `array()` returns `ArraySchema<T>`. If the constraint uses `ObjectLikeSchema` or `ObjectUnionSchema` instead, recursive schemas declared with getters can't infer their type when they use the creator.
