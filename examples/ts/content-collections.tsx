/* eslint-disable unused-imports/no-unused-vars */
import {
  array,
  createLoader,
  document,
  literal,
  optional,
  pick,
  reference,
  string,
} from '@sanity-labs/typed-schema'

// Plug in your own fetch implementation (e.g. a GROQ query via @sanity/client)
const {loadDocument, loadReference, loadReferences} = createLoader(
  async (id, fieldSelection) => {
    throw new Error(
      `Stubbed fetch for demo purposes: would fetch ${id} with ${fieldSelection.join(', ')}`,
    )
  },
)

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
