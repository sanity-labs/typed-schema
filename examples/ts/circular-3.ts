import {
  array,
  type ArrayValue,
  document,
  type DocumentSchemaOf,
  extend,
  type Infer,
  lazy,
  literal,
  reference,
  type ReferenceValue,
  string,
} from '@sanity-labs/typed-schema'

// This is and example of a circular type where the base schema is defined separately,
// and the self-referencing part is defined in a separate schema, minimizing the amount of work needed to
// type out both the typescript type and the schema type

// base blogpost schema
const BaseBlogpost = document({
  _type: literal('blogpost'),
  title: string(),
  //… more fields
})

// Define only the circular part here by extending from the inferred base schema
interface SelfReferencingBlogPost extends Infer<typeof BaseBlogpost> {
  mainRelated: ReferenceValue<SelfReferencingBlogPost>
  relatedPosts: ArrayValue<ReferenceValue<SelfReferencingBlogPost>>
}

// Now extend the base schema with the circular field
const Blogpost: DocumentSchemaOf<SelfReferencingBlogPost> = extend(
  BaseBlogpost,
  {
    mainRelated: lazy(() => reference(Blogpost)),
    relatedPosts: lazy(() => array(reference(Blogpost))),
  },
)

type Blogpost = Infer<typeof Blogpost>

declare const post: Blogpost

// works
console.log(post.mainRelated._ref)
post.relatedPosts.map(relatedPost => {
  console.log(relatedPost._ref)
})
