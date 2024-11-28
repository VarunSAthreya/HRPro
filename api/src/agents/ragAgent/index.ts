import axios from 'axios';
import { ChromaClient } from 'chromadb';
import { Response } from 'express';
import { nanoid } from 'nanoid';
import Ollama from 'ollama';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { EMBED_MODEL, OPENAI_API_KEY, SERPSTACK_API_KEY } from '../../env';
import { chunkTextBySentences } from '../../utils';

const llm_model = 'gpt-4o';
const client = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const llm = (messages: ChatCompletionMessageParam[], json: boolean) => {
  return client.chat.completions.create({
    model: llm_model,
    messages,
    temperature: 0,
    response_format: { type: json ? 'json_object' : 'text' },
  });
};

const streamResponse = async (response: string, res: Response) => {
  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are a dummy agent just repeat the response and DONT CHANGE ANYTHING',
      },
      { role: 'user', content: response },
    ],
    stream: true,
  });
  console.log('------- STREAMING RESPONSE -------');
  for await (const chunk of stream) {
    const message = chunk.choices[0]?.delta?.content || '';
    console.log(message);
    res.write(message);
  }
};

export const ingestData = async (text: string) => {
  const chroma = new ChromaClient();
  //   await chroma.deleteCollection({ name: 'rag_agent' });
  const collection = await chroma.getOrCreateCollection({
    name: 'rag_agent',
    metadata: { 'hnsw:space': 'cosine' },
  });
  const chunks = chunkTextBySentences(text, 10, 3);

  for await (const [_, chunk] of chunks.entries()) {
    const embed = (
      await Ollama.embeddings({ model: EMBED_MODEL, prompt: chunk })
    ).embedding;
    await collection.add({
      ids: ['rag_agent' + '-' + nanoid(10)],
      embeddings: [embed],
      metadatas: [{ source: 'contentstack' }],
      documents: [chunk],
    });
  }
  console.log('Data ingestion done successfully!');
};

const retriever = async (query: string) => {
  const chroma = new ChromaClient();
  const collection = await chroma.getOrCreateCollection({
    name: 'rag_agent',
    metadata: { 'hnsw:space': 'cosine' },
  });
  const queryembed = (
    await Ollama.embeddings({ model: EMBED_MODEL, prompt: query })
  ).embedding;

  const relevantDocs = (
    await collection.query({ queryEmbeddings: [queryembed], nResults: 5 })
  ).documents[0];

  return relevantDocs;
};

const format_docs = (docs) => docs.map((doc) => doc);

const routerInstructions = `
You are an expert at routing a user question to a vectorstore or web search.
The vectorstore contains documents related to policies related to contentstack, it has topics such as At-Will Employment
Employee and Contractor Privacy Notice
Internal Communications Guidelines
General Conduct Standards
• Use of Company Equipment, Data Security, and Compliance
Code of Business Ethics and Conduct
Modern Slavery Act
Personal Relationships Guidelines
Sexual Harassment Policy (India)
Employee Grievance Procedure Policy
Whistleblower Policy
Employee Performance Improvement Policy
India Employee Exit Policy
Recruitment Policy - India
Employee Onboarding Process in India
Compensation and benefits policy
Total Rewards
• Healthcare
• Everyday Wellbeing
• Flexi-Benefits & NPS
• Learning & Development
Activ Payroll Details
Learning & Development
• India Certification and Online Training Reimbursement Process
• Books and Courses Reimbursement Policy
• Career Upskilling Support Program (CUSP)
India Referral Policy
India Internal Job Movement Policy
Relocation Policy
Pay, Hours, And Leaves
Volunteer Policy
Benefits and Perks
Travel and Expense Policy
Voluntary Global Relocation Guidelines
Marriage and Childbirth Gift Card Policy
Reward & Recognition Policy
India Office Detail: Virar, Bangalore, Pune, and Chennai
Review and Update.
Use the vectorstore for questions on these topics. For all else, and especially for current events, use web-search.
Return JSON with a single key, datasource, that is 'websearch' or 'vectorstore' depending on the question.
`;

const web_search_instructions = `
You are an expert at google search add missing data to the question with following context:
- Company policies related to contentstack
NOTE: Keep the search query short and concise.
`;

const doc_grader_instructions = `You are a grader assessing relevance of a retrieved document to a user question.

If the document contains keyword(s) or semantic meaning related to the question, grade it as relevant.`;

const hallucination_grader_instructions = `

You are a teacher grading a quiz.

You will be given FACTS and a STUDENT ANSWER.

Here is the grade criteria to follow:

(1) Ensure the STUDENT ANSWER is grounded in the FACTS.

(2) Ensure the STUDENT ANSWER does not contain "hallucinated" information outside the scope of the FACTS.

Score:

A score of yes means that the student's answer meets all of the criteria. This is the highest (best) score.

A score of no means that the student's answer does not meet all of the criteria. This is the lowest possible score you can give.

Explain your reasoning in a step-by-step manner to ensure your reasoning and conclusion are correct.

Avoid simply stating the correct answer at the outset.`;

const answer_grader_instructions = `You are a teacher grading a quiz.

You will be given a QUESTION and a STUDENT ANSWER.

Here is the grade criteria to follow:

(1) The STUDENT ANSWER helps to answer the QUESTION

Score:

A score of yes means that the student's answer meets all of the criteria. This is the highest (best) score.

The student can receive a score of yes if the answer contains extra information that is not explicitly asked for in the question.

A score of no means that the student's answer does not meet all of the criteria. This is the lowest possible score you can give.

Explain your reasoning in a step-by-step manner to ensure your reasoning and conclusion are correct.

Avoid simply stating the correct answer at the outset.`;

async function retrieve(query: string) {
  const results = await retriever(query);
  return { documents: results };
}

async function generate(question: string, docs: string[], loop_step: number) {
  const docs_text = format_docs(docs);
  const rag_prompt_formatted = `You are an assistant for question-answering tasks.

  Here is the context to use to answer the question:

  ${docs_text}

  Think carefully about the above context.

  Now, review the user question:

  ${question}

  Provide an answer to this questions using only the above context.

  Use three sentences maximum and keep the answer concise.

  Answer:`;

  const generation = await llm(
    [{ content: rag_prompt_formatted, role: 'user' }],
    false
  );
  return { generation: generation, loop_step: loop_step + 1 };
}

const grade_documents = async (question: string, docs: string[]) => {
  const filtered_docs = [];
  let web_search = 'No';

  for (const d of docs) {
    // console.log(question, d);
    const doc_grader_prompt_formatted = `Here is the retrieved document: \n\n ${d} \n\n Here is the user question: \n\n ${question}.\n\nThis carefully and objectively assess whether the document contains at least some information that is relevant to the question.\n\nReturn JSON with single key, binary_score, that is 'yes' or 'no' score to indicate whether the document contains at least some information that is relevant to the question.`;

    const result = await llm(
      [
        { content: doc_grader_instructions, role: 'system' },
        { content: doc_grader_prompt_formatted, role: 'user' },
      ],
      true
    );

    const messageContent = result.choices[0].message.content;
    // console.log(messageContent);
    const grade: string = JSON.parse(messageContent.toString()).binary_score;
    console.log(grade);

    if (grade.toLowerCase() == 'yes') {
      console.log('---GRADE: DOCUMENT RELEVANT---');
      filtered_docs.push(d);
    }
  }
  if (filtered_docs.length === 0) {
    web_search = 'Yes';
  }
  return { documents: filtered_docs, web_search: web_search };
};

async function web_search(question: string, docs: string[]) {
  const search = await axios({
    url: `http://api.serpstack.com/search?query=${question}&access_key=${SERPSTACK_API_KEY}`,
    method: 'GET',
  });

  let web_results = search.data.organic_results;
  //   console.dir(web_results, { depth: null });
  docs.push(JSON.stringify(web_results));
  return { documents: docs };
}

async function route_question(question: string) {
  console.log('---ROUTE QUESTION---');
  const route_question = await llm(
    [
      { content: routerInstructions, role: 'system' },
      { content: question, role: 'user' },
    ],
    true
  );
  const source = JSON.parse(
    route_question.choices[0].message.content.toString()
  ).datasource;
  if (source === 'websearch') {
    console.log('---ROUTE QUESTION TO WEB SEARCH---');
    return 'websearch';
  } else if (source === 'vectorstore') {
    console.log('---ROUTE QUESTION TO RAG---');
    return 'vectorstore';
  }
}

function decide_to_generate(web_search: string) {
  console.log('---ASSESS GRADED DOCUMENTS---');

  if (web_search == 'Yes') {
    // All documents have been filtered check_relevance
    // We will re-generate a new query
    console.log(
      '---DECISION: NOT ALL DOCUMENTS ARE RELEVANT TO QUESTION, INCLUDE WEB SEARCH---'
    );
    return 'websearch';
  } else {
    // We have relevant documents, so generate answer
    console.log('---DECISION: GENERATE---');
    return 'generate';
  }
}

async function grade_generation_v_documents_and_question(
  question: string,
  documents: string[],
  generation: any,
  max_retries: number,
  loop_step: number
) {
  console.log('---CHECK HALLUCINATIONS---');

  const hallucination_grader_prompt_formatted = `FACTS: \n\n ${format_docs(
    documents
  )} \n\n STUDENT ANSWER: ${
    generation.choices[0].message.content
  }. \n\nReturn JSON with two keys, binary_score is 'yes' or 'no' score to indicate whether the STUDENT ANSWER is grounded in the FACTS. And a key, explanation, that contains an explanation of the score.`;
  const result = await llm(
    [
      { content: hallucination_grader_instructions, role: 'system' },
      { content: hallucination_grader_prompt_formatted, role: 'user' },
    ],
    true
  );
  const grade: string = JSON.parse(
    result.choices[0].message.content.toString()
  )['binary_score'];
  console.log('----------------->>', grade);

  if (grade.toLowerCase() == 'yes') {
    console.log('---DECISION: GENERATION IS GROUNDED IN DOCUMENTS---');
    console.log('---GRADE GENERATION vs QUESTION---');

    const answer_grader_prompt_formatted = `QUESTION: \n\n ${question} \n\n STUDENT ANSWER: ${generation.choices[0].message.content}.

Return JSON with two keys, binary_score is 'yes' or 'no' score to indicate whether the STUDENT ANSWER meets the criteria. And a key, explanation, that contains an explanation of the score.`;

    const result = await llm(
      [
        { content: answer_grader_instructions, role: 'system' },
        { content: answer_grader_prompt_formatted, role: 'user' },
      ],
      true
    );
    const grade: string = JSON.parse(
      result.choices[0].message.content.toString()
    )['binary_score'];
    console.log('----------------->>', grade);
    if (grade.toLowerCase() == 'yes') {
      console.log('---DECISION: GENERATION ADDRESSES QUESTION---');
      return 'useful';
    } else if (loop_step <= max_retries) {
      console.log('---DECISION: GENERATION DOES NOT ADDRESS QUESTION---');
      console.log(generation.choices[0].message.content);
      return 'not useful';
    } else {
      console.log('---DECISION: MAX RETRIES REACHED---');
      return 'max retries';
    }
  } else if (loop_step <= max_retries) {
    console.log(
      '---DECISION: GENERATION IS NOT GROUNDED IN DOCUMENTS, RE-TRY---'
    );
    return 'not supported';
  } else {
    console.log('---DECISION: MAX RETRIES REACHED---');
    return 'max retries';
  }
}

export const execute = async (question: string, res: Response) => {
  const maxRetries = 3;
  const route = await route_question(question);
  console.log(route);

  async function doWebSearch(calledFromVectorStore = false) {
    const docs = [];
    const response = await llm(
      [
        { content: web_search_instructions, role: 'system' },
        { content: question, role: 'user' },
      ],
      false
    );
    const query = response.choices[0].message.content;
    // console.log('----------------------------------->', query);
    let result = '';
    for (let i = 0; i < maxRetries; i++) {
      const web_search_results = await web_search(query, docs);
      //   console.log(web_search_results);

      const generation = await generate(query, docs, i);
      //   console.log(generation);

      const grade = await grade_generation_v_documents_and_question(
        query,
        web_search_results.documents,
        generation.generation,
        maxRetries,
        i
      );
      //   console.log(grade);

      if (grade == 'useful' || grade == 'max retries') {
        // console.log(generation.generation.choices[0].message.content);
        result = generation.generation.choices[0].message.content;
        break;
      } else if (grade == 'not useful') {
        if (i == maxRetries - 1) {
          result = "I'm sorry, I don't have an answer for that.";
          break;
        }
        continue;
      } else if (grade == 'not supported') {
        result = "I'm sorry, I don't have an answer for that.";
      }
    }
    if (calledFromVectorStore) {
      return result;
    } else {
      await streamResponse(result, res);
    }
  }

  if (route == 'websearch') {
    await doWebSearch();
  } else if (route == 'vectorstore') {
    let result = '';

    const docs = await retrieve(question);
    // console.log(docs);
    const grade_docs = await grade_documents(
      question,
      format_docs(docs.documents)
    );
    // console.log(grade_docs);
    //
    if (grade_docs.web_search == 'Yes') {
      result = await doWebSearch(true);
    } else {
      const generation = await generate(question, docs.documents, 0);
      //   console.log(generation);

      const grade = await grade_generation_v_documents_and_question(
        question,
        docs.documents,
        generation.generation,
        maxRetries,
        0
      );
      //   console.log(grade);

      if (grade == 'useful' || grade == 'max retries') {
        // console.log(generation.generation.choices[0].message.content);
        result = generation.generation.choices[0].message.content;
      } else if (grade == 'not useful') {
        // return await doWebSearch()
        result = await doWebSearch(true);
      } else if (grade == 'not supported') {
        // console.log('Not supported');
        result = "I'm sorry, I don't have an answer for that.";
      }
    }
    await streamResponse(result, res);
  }
};
