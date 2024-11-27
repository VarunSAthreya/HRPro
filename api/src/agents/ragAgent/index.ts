import { WebBaseLoader } from '@langchain/core/document_loaders';
import { NomicEmbeddings } from '@langchain/core/embeddings';
import {
  Document,
  HumanMessage,
  SystemMessage,
  VectorStoreRetriever,
} from '@langchain/core/schema';
import { SKLearnVectorStore } from '@langchain/core/vectorstores';
import * as dotenv from 'dotenv';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Ollama } from 'ollama';
import * as readline from 'readline';

dotenv.config();

// Utility function to set environment variables securely
function setEnv(varName: string): void {
  if (!process.env[varName]) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`${varName}: `, (answer) => {
      process.env[varName] = answer;
      rl.close();
    });
  }
}

// Setting up environment variables
setEnv('TAVILY_API_KEY');
setEnv('LANGSMITH_API_KEY');
process.env['TOKENIZERS_PARALLELISM'] = 'true';
process.env['LANGCHAIN_TRACING_V2'] = 'true';
process.env['LANGCHAIN_PROJECT'] = 'local-llama32-rag';

// Initialize LLMs
const ollama = new Ollama({
  model: 'llama3.2:3b-instruct-fp16',
  temperature: 0,
});
const ollamaJson = new Ollama({
  model: 'llama3.2:3b-instruct-fp16',
  temperature: 0,
  format: 'json',
});

// URLs to process
const urls = [
  'https://lilianweng.github.io/posts/2023-06-23-agent/',
  'https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/',
  'https://lilianweng.github.io/posts/2023-10-25-adv-attack-llm/',
];

// Load documents
async function loadDocuments(urls: string[]): Promise<Document[]> {
  const docs = await Promise.all(
    urls.map((url) => new WebBaseLoader(url).load())
  );
  return docs.flat();
}

// Split documents
async function splitDocuments(docs: Document[]): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  return splitter.splitDocuments(docs);
}

// Create vector store
async function createVectorStore(
  docs: Document[]
): Promise<VectorStoreRetriever> {
  const vectorstore = await SKLearnVectorStore.fromDocuments(
    docs,
    new NomicEmbeddings({
      model: 'nomic-embed-text-v1.5',
      inferenceMode: 'local',
    })
  );
  return vectorstore.asRetriever({ k: 3 });
}

// Router instructions
const routerInstructions = `You are an expert at routing a user question to a vectorstore or web search.
The vectorstore contains documents related to agents, prompt engineering, and adversarial attacks.
Use the vectorstore for questions on these topics. For all else, and especially for current events, use web search.
Return JSON with single key, datasource, that is 'websearch' or 'vectorstore' depending on the question.`;

// Route question to web search or vectorstore
async function routeQuestion(question: string): Promise<string> {
  const result = await ollamaJson.invoke([
    new SystemMessage({ content: routerInstructions }),
    new HumanMessage({ content: question }),
  ]);
  return JSON.parse(result.content).datasource;
}

// Retrieve documents
async function retrieve(
  question: string,
  retriever: VectorStoreRetriever
): Promise<Document[]> {
  return await retriever.getRelevantDocuments(question);
}

// Generate answer
async function generate(question: string, docs: Document[]): Promise<string> {
  const formattedDocs = docs.map((doc) => doc.pageContent).join('\n');
  const prompt = `Context: \n\n${formattedDocs}\n\nQuestion: ${question}`;
  const result = await ollama.invoke([new HumanMessage({ content: prompt })]);
  return result.content;
}

// Grade documents for relevance
async function gradeDocuments(
  question: string,
  docs: Document[]
): Promise<{ relevantDocs: Document[]; needsWebSearch: boolean }> {
  const docGraderPrompt = `You are a grader assessing relevance of a retrieved document to a user question.
  If the document contains keyword(s) or semantic meaning related to the question, grade it as relevant.`;

  let relevantDocs: Document[] = [];
  let needsWebSearch = false;

  for (const doc of docs) {
    const prompt = `Here is the retrieved document: \n\n${doc.pageContent}\n\n Here is the user question: \n\n${question}.
    Return JSON with single key, binary_score, that is 'yes' or 'no' to indicate whether the document is relevant.`;
    const result = await ollamaJson.invoke([
      new SystemMessage({ content: docGraderPrompt }),
      new HumanMessage({ content: prompt }),
    ]);
    const grade = JSON.parse(result.content).binary_score;

    if (grade === 'yes') {
      relevantDocs.push(doc);
    } else {
      needsWebSearch = true;
    }
  }

  return { relevantDocs, needsWebSearch };
}

// Run workflow
async function runWorkflow(question: string) {
  // Load and preprocess documents
  const docs = await loadDocuments(urls);
  const splitDocs = await splitDocuments(docs);
  const retriever = await createVectorStore(splitDocs);

  const dataSource = await routeQuestion(question);
  if (dataSource === 'websearch') {
    console.log('Routing to web search...');
    // Handle web search here
  } else if (dataSource === 'vectorstore') {
    console.log('Routing to vectorstore...');
    const retrievedDocs = await retrieve(question, retriever);
    const { relevantDocs, needsWebSearch } = await gradeDocuments(
      question,
      retrievedDocs
    );

    if (needsWebSearch) {
      console.log(
        'Some documents were irrelevant. Web search might be needed.'
      );
    } else {
      const answer = await generate(question, relevantDocs);
      console.log('Generated answer:', answer);
    }
  }
}

// Example usage
runWorkflow('What are the types of agent memory?');
