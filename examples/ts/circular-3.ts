import {
  array,
  document,
  extend,
  type Infer,
  lazy,
  literal,
  reference,
  type SanityArrayValue,
  type SanityDocumentType,
  type SanityReferenceValue,
  string,
} from '@sanity-labs/typed-schema'

// This is and example of a circular type where the base schema is defined separately,
// and the self-referencing part is defined in a separate schema, minimizing the amount of work needed to
// type out both the typescript type and the schema type

// base blogpost schema
const baseBlogpost = document({
  _type: literal('blogpost'),
  title: string(),
  //… more fields
})

// Define only the circular part here by extending from the inferred base schema
interface SelfReferencingBlogPost extends Infer<typeof baseBlogpost> {
  mainRelated: SanityReferenceValue<SelfReferencingBlogPost>
  relatedPosts: SanityArrayValue<SanityReferenceValue<SelfReferencingBlogPost>>
}

// Now extend the base schema with the circular field
const blogpost: SanityDocumentType<SelfReferencingBlogPost> = extend(
  baseBlogpost,
  {
    mainRelated: lazy(() => reference(blogpost)),
    relatedPosts: lazy(() => array(reference(blogpost))),
  },
)

type BlogPost = Infer<typeof blogpost>

declare const post: BlogPost

// works
console.log(post.mainRelated._ref)
post.relatedPosts.map(relatedPost => {
  console.log(relatedPost._ref)
})
