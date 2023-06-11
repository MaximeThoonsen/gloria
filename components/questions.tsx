import { useState } from 'react'

const QuestionForm = () => {
  const [question, setQuestion] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Call your API here with the question
    // For example:
    setIsLoading(true)
    setLastQuestion(question)
    const response = await fetch('/api/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: question,
    })

    const data = await response.json()
    setAnswer(data.text)
    setQuestion('')
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="border-2 border-gray-300 p-2 rounded-md focus:outline-none focus:border-indigo-500"
        placeholder="Type your question here"
      />
      <button
        type="submit"
        className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600"
      >
        {isLoading ? 'Your question is being processed ⌛️' : 'Send Question'}
      </button>
      {answer && !isLoading && (
        <div className="bg-green-100 border border-green-200 p-4 rounded-md">
          <p className="font-bold text-green-700">Question:</p>
          <p className="text-green-700">{lastQuestion}</p>
          <p className="font-bold text-green-700">Answer:</p>
          <p className="text-green-700">{answer}</p>
        </div>
      )}
    </form>
  )
}

export default QuestionForm
