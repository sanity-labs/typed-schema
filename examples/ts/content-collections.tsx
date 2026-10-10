/* eslint-disable unused-imports/no-unused-vars */
import {
  array,
  document,
  literal,
  loadDocument,
  loadReference,
  loadReferences,
  optional,
  pick,
  reference,
  string,
} from '@sanity-labs/typed-schema'

const authorSchema = document({
  _type: literal('author'),
  name: optional(string()),
  slug: string(),
})

const blogpostSchema = document({
  _type: literal('blogpost'),
  title: string(),
  author: reference(authorSchema),
  coauthors: array(reference(authorSchema)),
})

const blogPost = await loadDocument(blogpostSchema, 'welcome')

const partialBlogPostSchema = pick(blogpostSchema, [
  '_id',
  '_type',
  'title',
  'author',
  'coauthors',
])

// can even load partial documents – this will only fetch the title, author and coauthors fields
const partialBlogPost = await loadDocument(partialBlogPostSchema, 'welcome')

// Resolve a singular reference
const author = await loadReference(blogPost.author)

console.log(author._createdAt.length)

// Resolve an array of references
const coauthors = await loadReferences(blogPost.coauthors)

function Component() {
  return (
    <>
      <h1>{blogPost.title}</h1>
      <p>Author: {author.name}</p>
      {coauthors.map(coauthor => (
        <a href={`/${coauthor.slug}`}>{coauthor.name}</a>
      ))}
    </>
  )
}
