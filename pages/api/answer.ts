import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaVectorStore } from 'langchain/vectorstores'
import { OpenAIEmbeddings } from 'langchain/embeddings'
import { LLMChain, StuffDocumentsChain, VectorDBQAChain } from 'langchain/chains'
import { OpenAI, PromptTemplate } from 'langchain'
import { PrismaClient, Prisma, documents } from '@prisma/client'

// eslint-disable-next-line import/no-anonymous-default-export
export default async (req: NextApiRequest, res: NextApiResponse) => {
  const question = req.body

  const prisma = new PrismaClient()
  const questionInDB = await prisma.question.create({
    data: {
      content: question,
    },
  })

  const vectorStore = PrismaVectorStore.withModel<documents>(prisma).create(
    new OpenAIEmbeddings(),
    {
      prisma: Prisma,
      tableName: 'documents',
      vectorColumnName: 'embedding',
      columns: {
        id: PrismaVectorStore.IdColumn,
        content: PrismaVectorStore.ContentColumn,
      },
    }
  )

  const model = new OpenAI({
    modelName: 'gpt-3.5-turbo',
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.5,
  })

  const promptTemplateBot = /*#__PURE__*/ new PromptTemplate({
    template:
      'You act as if you were Maxime Thoonsen a CTO of a digital service company that creates complex web applications for their customers.' +
      "Your goal is to answer questions from people who are reading Maxime's blog. Use the following pieces of context to answer the question in a FRIENDLY way at the end as if you were Maxime. If you don't know the answer, just say that you don't know, don't try to make up an answer. Context:\n\n{context}\n\nQuestion: {question}\nHelpful Answer:",

    inputVariables: ['context', 'question'],
  })

  const llmChain = new LLMChain({ llm: model, prompt: promptTemplateBot })
  const stuffChain = new StuffDocumentsChain({ llmChain })

  const chain = new VectorDBQAChain({
    vectorstore: vectorStore,
    combineDocumentsChain: stuffChain,
    returnSourceDocuments: true,
    k: 4,
  })

  /* Ask it a question and the answer */
  const result = await chain.call({
    query: question,
  })

  await prisma.question.update({
    where: {
      id: questionInDB.id,
    },
    data: {
      answer: result.text,
      successFromLLM: true,
    },
  })

  return res.status(200).json(result)
}
