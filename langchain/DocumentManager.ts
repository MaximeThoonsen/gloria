import { Document } from 'langchain/document'
import { DocumentBlog } from './DocumentBlog'

export const createDocumentsBlogFromDocumentsArray = async (
  documents: Document[],
  type: string
): Promise<DocumentBlog[]> => {
  const { createHash } = await import('node:crypto')

  const documentsBlog: DocumentBlog[] = []

  for (const document of documents) {
    const documentBlog = new DocumentBlog(document)
    documentBlog.sourceType = type
    documentBlog.sourceName = document.metadata.source
    const hash = createHash('sha1')
    documentBlog.hash = hash.update(document.pageContent).digest('hex')
    documentBlog.id = getUniqueIDFromDocument(documentBlog)

    documentsBlog.push(documentBlog)
  }

  return documentsBlog
}

export const getUniqueIDFromDocument = (document: DocumentBlog): string => {
  const lines = document.metadata.loc.lines
  const loc = lines.from + '-' + lines.to

  return document.sourceType + ':' + document.sourceName + ':' + loc
}
