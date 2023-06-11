import { NextApiRequest, NextApiResponse } from 'next'
import { DirectoryLoader, TextLoader } from 'langchain/document_loaders'
import { OpenAI } from 'langchain'
import { CharacterTextSplitter } from 'langchain/text_splitter'
import fs from 'fs'

// eslint-disable-next-line import/no-anonymous-default-export
export default async (req: NextApiRequest, res: NextApiResponse) => {
  // return res.status(200).json({ message: 'ok' })
  if (req.query.secret !== 'opirejhfgi67869876dqjskljfsdhljrziueaflakz') {
    return res.status(401).json({ message: 'Invalid token' })
  }

  /** Provide the directory path of your notion folder */
  const loader = new DirectoryLoader('kb/talk', {
    '.txt': (path) => new TextLoader(path),
  })
  const docs = await loader.load()

  const model = new OpenAI({
    modelName: 'gpt-3.5-turbo',
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.5,
  })

  const splitter = new CharacterTextSplitter({
    separator: '.\n',
    chunkSize: 1500,
    chunkOverlap: 200,
  })

  const docs2 = await splitter.splitDocuments(docs)

  let i = 0
  for (const doc of docs2) {
    const res = await model.call('translate this french text into english:\n' + doc.pageContent)

    fs.writeFileSync('newdoc-' + i + '.txt', 'fr:\n' + doc.pageContent + '\n\nen:\n' + res)
    i++
  }

  return res.status(200).json(docs2)
}
