import { Document, DocumentInput } from 'langchain/document'

export class DocumentBlog extends Document implements DocumentInput {
  constructor(fields) {
    super(fields)
    this.sourceType = fields.sourceType
    this.sourceName = fields.sourceName
    this.hash = fields.hash
    this.embedding = fields.embedding
  }

  sourceType: string
  sourceName: string
  hash: string
  id: string
  embedding: string
}
