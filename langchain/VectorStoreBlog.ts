import { Metadata } from '@opensearch-project/opensearch/api/types.js'
import { DataSource, DataSourceOptions, EntitySchema } from 'typeorm'
import { DocumentBlog } from './DocumentBlog'
import { VectorStore } from 'langchain/vectorstores'
import { Embeddings } from 'langchain/embeddings'

export interface TypeORMVectorStoreArgs {
  postgresConnectionOptions: DataSourceOptions
  tableName?: string
  filter?: Metadata
  verbose?: boolean
}

export class VectorStoreBlogDocument extends DocumentBlog {
  embedding: string
}

const defaultDocumentTableName = 'documents'

export class VectorStoreBlog extends VectorStore {
  declare FilterType: Metadata

  tableName: string

  documentEntity: EntitySchema

  filter?: Metadata

  appDataSource: DataSource

  _verbose?: boolean

  constructor(embeddings: Embeddings, fields: TypeORMVectorStoreArgs) {
    super(embeddings, fields)
    this.tableName = fields.tableName || defaultDocumentTableName
    this.filter = fields.filter

    const TypeORMDocumentEntity = new EntitySchema<VectorStoreBlogDocument>({
      name: fields.tableName ?? defaultDocumentTableName,
      columns: {
        id: {
          type: String,
          primary: true,
        },
        pageContent: {
          type: String,
        },
        metadata: {
          type: 'jsonb',
        },
        hash: {
          type: String,
        },
        sourceType: {
          type: String,
        },
        sourceName: {
          type: String,
        },
        embedding: {
          type: String,
        },
      },
    })
    const appDataSource = new DataSource({
      entities: [TypeORMDocumentEntity],
      ...fields.postgresConnectionOptions,
    })
    this.appDataSource = appDataSource
    this.documentEntity = TypeORMDocumentEntity
  }

  async addDocuments(documents: DocumentBlog[]): Promise<void> {
    if (!this.appDataSource.isInitialized) {
      await this.appDataSource.initialize()
    }

    const texts = documents.map(({ pageContent }) => pageContent)
    return this.addVectors(await this.embeddings.embedDocuments(texts), documents)
  }

  async addVectors(vectors: number[][], documents: DocumentBlog[]): Promise<void> {
    const rows = vectors.map((embedding, idx) => {
      const embeddingString = `[${embedding.join(',')}]`
      documents[idx].embedding = embeddingString
      return documents[idx]
    })

    const documentRepository = this.appDataSource.getRepository(this.documentEntity)

    const chunkSize = 500
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)

      try {
        await documentRepository.upsert(chunk, ['id'])
      } catch (e) {
        console.error(e)
        throw new Error(`Error inserting: ${chunk[0].pageContent}`)
      }
    }
  }

  static async fromDocuments(
    docs: DocumentBlog[],
    embeddings: Embeddings,
    dbConfig: TypeORMVectorStoreArgs
  ): Promise<VectorStoreBlog> {
    const instance = new VectorStoreBlog(embeddings, dbConfig)
    await instance.addDocuments(docs)

    return instance
  }

  async similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: this['FilterType']
  ): Promise<[VectorStoreBlogDocument, number][]> {
    if (!this.appDataSource.isInitialized) {
      await this.appDataSource.initialize()
    }

    const embeddingString = `[${query.join(',')}]`
    const _filter = filter ?? '{}'

    const queryString = `
      SELECT *, embedding <=> $1 as "_distance"
      FROM ${this.tableName}
      WHERE metadata @> $2
      ORDER BY "_distance" ASC
      LIMIT $3;`

    const documents = await this.appDataSource.query(queryString, [embeddingString, _filter, k])

    const results = [] as [VectorStoreBlogDocument, number][]
    for (const doc of documents) {
      if (doc._distance != null && doc.pageContent != null) {
        const document = new DocumentBlog(doc) as VectorStoreBlogDocument
        document.id = doc.id
        results.push([document, doc._distance])
      }
    }

    return results
  }

  static async fromTexts(
    texts: string[],
    // eslint-disable-next-line @typescript-eslint/ban-types
    metadatas: object[] | object,
    embeddings: Embeddings,
    dbConfig: TypeORMVectorStoreArgs
  ): Promise<VectorStoreBlog> {
    const docs = []
    for (let i = 0; i < texts.length; i += 1) {
      const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas
      const newDoc = new DocumentBlog({
        pageContent: texts[i],
        metadata,
      })
      docs.push(newDoc)
    }

    return VectorStoreBlog.fromDocuments(docs, embeddings, dbConfig)
  }
}
