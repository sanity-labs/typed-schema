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

const Author = document({
  _type: literal('author'),
  name: optional(string()),
  slug: string(),
})

const Blogpost = document({
  _type: literal('blogpost'),
  title: string(),
  author: reference(Author),
  coauthors: array(reference(Author)),
})

const blogPost = await loadDocument(Blogpost, 'welcome')

const PartialBlogPost = pick(Blogpost, [
  '_id',
  '_type',
  'title',
  'author',
  'coauthors',
])

// can even load partial documents – this will only fetch the title, author and coauthors fields
const partialBlogPost = await loadDocument(PartialBlogPost, 'welcome')

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
