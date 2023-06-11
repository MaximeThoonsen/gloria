import { documents, Prisma, PrismaClient } from '@prisma/client'
import { DirectoryLoader, TextLoader } from 'langchain/document_loaders'
import { CharacterTextSplitter } from 'langchain/text_splitter'
import { createDocumentsBlogFromDocumentsArray } from '../langchain/DocumentManager'
import { OpenAIEmbeddings } from 'langchain/embeddings'
import { VectorStoreBlog } from '../langchain/VectorStoreBlog'

const prisma = new PrismaClient()

export const run = async () => {
  const loader = new DirectoryLoader('data/blog', {
    '.mdx': (path) => new TextLoader(path),
  })
  const docs = await loader.load()
  const loader2 = new DirectoryLoader('knowledge-base', {
    '.txt': (path) => new TextLoader(path),
  })
  docs.push(...(await loader2.load()))

  const splitter = new CharacterTextSplitter({
    separator: '.\n',
    chunkSize: 1500,
    chunkOverlap: 200,
  })

  const splittedDocs = await splitter.splitDocuments(docs)
  const documentsBlog = await createDocumentsBlogFromDocumentsArray(splittedDocs, 'files')

  // For a given document, we delete all documents in the database that have not the same id as
  // the ones we are trying to upsert because it means that the split of the file is not the same anymore
  for (const doc of docs) {
    //search for existing document with sourceName and type
    const documentsInDatabase = await prisma.documents.findMany({
      where: {
        sourceName: doc.metadata.source,
        sourceType: 'files',
      },
    })

    const documentsThatWillBeUpserted = documentsBlog.filter(
      (d) => d.sourceName === doc.metadata.source
    )
    const idsDocumentsThatWillBeUpserted = documentsThatWillBeUpserted.map((d) => d.id)

    const idsDocumentsThatWeShouldDeleted = documentsInDatabase
      .filter((d) => !idsDocumentsThatWillBeUpserted.includes(d.id))
      .map((d) => d.id)

    console.log('idsDocumentsThatWeShouldDeleted', idsDocumentsThatWeShouldDeleted)

    await prisma.documents.deleteMany({
      where: {
        id: {
          in: idsDocumentsThatWeShouldDeleted,
        },
      },
    })
  }

  const docsToUpsert = []

  for (const doc of documentsBlog) {
    const document = await prisma.documents.findUnique({
      where: {
        id: doc.id,
      },
    })
    if (document) {
      if (document.hash === doc.hash) {
        console.log(doc.id, 'same hash ignore')
      } else {
        docsToUpsert.push(doc)
        console.log(doc.id, 'need to update')
      }
    } else {
      docsToUpsert.push(doc)
      console.log(doc.id, 'need to create')
    }
  }

  // eslint-disable-next-line prettier/prettier
  // const doc = {
  //   id: docsToUpsert[0].id,
  //   content: docsToUpsert[0].content,
  //   embedding: docsToUpsert[0].embedding,
  //   metadata: docsToUpsert[0].metadata,
  //   sourceName: docsToUpsert[0].sourceName,
  //   sourceType: docsToUpsert[0].sourceType,
  //   hash: docsToUpsert[0].hash,
  // } as documents
  //
  // await prisma.documents.create({ data: doc })

  // const vectorStore = VectorStoreBlog.withModel<documents>(prisma).create(new OpenAIEmbeddings(), {
  //   prisma: Prisma,
  //   tableName: 'documents',
  //   vectorColumnName: 'embedding',
  //   columns: {
  //     id: VectorStoreBlog.IdColumn,
  //     content: VectorStoreBlog.ContentColumn,
  //   },
  // })

  const url = process.env.DATABASE_URL
  if (!url) throw new Error(`Expected env var DATABASE_URL`)

  const vectorStore = new VectorStoreBlog(new OpenAIEmbeddings(), {
    postgresConnectionOptions: {
      type: 'postgres',
      url: url,
    },
  })

  await vectorStore.addDocuments(docsToUpsert)

  console.log('done')
}

run()
