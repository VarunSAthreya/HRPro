import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { DocumentInterface } from '@langchain/core/documents';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { OllamaEmbeddings } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import axios from 'axios';
import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { EMBED_MODEL } from './env';

(async () => {
  const local_llm = 'gpt-4o';
  const llm = new ChatOpenAI({
    model: local_llm,
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  });
  const llm_json_mode = new ChatOpenAI({
    model: local_llm,
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  }).bind({
    response_format: {
      type: 'json_object',
    },
  });

  const urls = [
    'https://lilianweng.github.io/posts/2023-06-23-agent/',
    'https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/',
    'https://lilianweng.github.io/posts/2023-10-25-adv-attack-llm/',
  ];

  const loadDocuments = async (): Promise<Document[]> => {
    const docs = await Promise.all(
      urls.map((url) => new CheerioWebBaseLoader(url).load())
    );
    return docs.flat();
  };

  const docs = await loadDocuments();
  // docs_list = [item for sublist in docs for item in sublist]
  const docs_list = docs.map((doc) => doc.pageContent).flat();

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const docSplits = await textSplitter.splitDocuments(docs);

  //   console.log(docSplits);

  const vectorstore = await Chroma.fromDocuments(
    docSplits,
    new OllamaEmbeddings({ model: EMBED_MODEL }),
    { collectionName: 'test-rag' } // Add appropriate dbConfig here
  );

  // Create retriever
  const retriever = vectorstore.asRetriever({ k: 3 });

  //   console.log('-------------router test-----------------');
  // Router Instructions
  const routerInstructions = `
  You are an expert at routing a user question to a vectorstore or web search.
  The vectorstore contains documents related to agents, prompt engineering, and adversarial attacks.
  Use the vectorstore for questions on these topics. For all else, and especially for current events, use web-search.
  Return JSON with a single key, datasource, that is 'websearch' or 'vectorstore' depending on the question.
`;

  //   const test_web_search = await llm_json_mode.invoke([
  //     new SystemMessage({ content: routerInstructions }),
  //     new HumanMessage({
  //       content:
  //         'Who is favored to win the NFC Championship game in the 2024 season?',
  //     }),
  //   ]);
  //   console.log(test_web_search.content);

  //   const test_web_search_2 = await llm_json_mode.invoke([
  //     new SystemMessage({ content: routerInstructions }),
  //     new HumanMessage({
  //       content: 'What are the models released today for llama3.2?',
  //     }),
  //   ]);
  //   console.log(test_web_search_2.content);

  //   const test_vector_store = await llm_json_mode.invoke([
  //     new SystemMessage({ content: routerInstructions }),
  //     new HumanMessage({ content: 'What are the types of agent memory?' }),
  //   ]);
  //   console.log(test_vector_store.content);
  //   console.log('-------------router test-----------------');

  //   console.log('-------------grader test-----------------');

  // Doc grader instructions
  const doc_grader_instructions = `You are a grader assessing relevance of a retrieved document to a user question.

If the document contains keyword(s) or semantic meaning related to the question, grade it as relevant.`;

  // Test
  //   const question = 'What is Chain of thought prompting?';
  //   const retrievedDocs = await retriever.invoke(question);
  //   const doc_txt = retrievedDocs[1].pageContent;
  //   console.log(doc_txt);
  //   const doc_grader_prompt_formatted = `Here is the retrieved document: \n\n ${doc_txt} \n\n Here is the user question: \n\n ${question}.\n\nThis carefully and objectively assess whether the document contains at least some information that is relevant to the question.\n\nReturn JSON with single key, binary_score, that is 'yes' or 'no' score to indicate whether the document contains at least some information that is relevant to the question.`;
  //   const result = await llm_json_mode.invoke([
  //     new SystemMessage({ content: doc_grader_instructions }),
  //     new HumanMessage({ content: doc_grader_prompt_formatted }),
  //   ]);
  //   console.log(result.content);

  //   console.log('-------------grader test-----------------');

  //   console.log('-------------hallucination test-----------------');

  const format_docs = (docs) => docs.map((doc) => doc.pageContent);

  //   # Test
  //   const retrivedDoc2 = await retriever.invoke(question);
  //   const docs_txt = format_docs(retrivedDoc2);
  //   const rag_prompt_formatted = `You are an assistant for question-answering tasks.

  //   Here is the context to use to answer the question:

  //   ${docs_txt}

  //   Think carefully about the above context.

  //   Now, review the user question:

  //   ${question}

  //   Provide an answer to this questions using only the above context.

  //   Use three sentences maximum and keep the answer concise.

  //   Answer:`;
  //   const generation = await llm.invoke([
  //     new HumanMessage({ content: rag_prompt_formatted }),
  //   ]);
  //   console.log(generation.content);

  //   # Hallucination grader instructions
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

  // # Grader prompt
  const hallucination_grader_prompt = `FACTS: \n\n {documents} \n\n STUDENT ANSWER: {generation}.

Return JSON with two two keys, binary_score is 'yes' or 'no' score to indicate whether the STUDENT ANSWER is grounded in the FACTS. And a key, explanation, that contains an explanation of the score.`;

  // # Test using documents and generation from above
  //   const hallucination_grader_prompt_formatted = `FACTS: \n\n ${docs_txt} \n\n STUDENT ANSWER: ${generation.content}. \n\nReturn JSON with two keys, binary_score is 'yes' or 'no' score to indicate whether the STUDENT ANSWER is grounded in the FACTS. And a key, explanation, that contains an explanation of the score.`;

  //   const hallucination_result = await llm_json_mode.invoke([
  //     new SystemMessage({ content: hallucination_grader_instructions }),
  //     new HumanMessage({ content: hallucination_grader_prompt_formatted }),
  //   ]);
  //   console.log(JSON.parse(hallucination_result.content.toString()));
  //   console.log('-------------hallucination test-----------------');
  //   console.log('-------------answer grader test-----------------');

  //   # Answer grader instructions
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

  // # Grader prompt
  const answer_grader_prompt = `QUESTION: \n\n {question} \n\n STUDENT ANSWER: {generation}.

Return JSON with two two keys, binary_score is 'yes' or 'no' score to indicate whether the STUDENT ANSWER meets the criteria. And a key, explanation, that contains an explanation of the score.`;

  // # Test
  const question1 =
    'What are the vision models released today as part of Llama 3.2?';
  const answer =
    "The Llama 3.2 models released today include two vision models: Llama 3.2 11B Vision Instruct and Llama 3.2 90B Vision Instruct, which are available on Azure AI Model Catalog via managed compute. These models are part of Meta's first foray into multimodal AI and rival closed models like Anthropic's Claude 3 Haiku and OpenAI's GPT-4o mini in visual reasoning. They replace the older text-only Llama 3.1 models.";

  // # Test using question and generation from above
  const answer_grader_prompt_formatted = `QUESTION: \n\n ${question1} \n\n STUDENT ANSWER: ${answer}.

Return JSON with two keys, binary_score is 'yes' or 'no' score to indicate whether the STUDENT ANSWER meets the criteria. And a key, explanation, that contains an explanation of the score.`;
  //   const graderResult = await llm_json_mode.invoke([
  //     new SystemMessage({ content: answer_grader_instructions }),
  //     new HumanMessage({ content: answer_grader_prompt_formatted }),
  //   ]);
  //   console.log(JSON.parse(graderResult.content.toString()));
  //   console.log('-------------answer grader test-----------------');

  const web_search_tool = new TavilySearchResults({
    maxResults: 3,
  });

  async function retrieve(query: string) {
    const results = await retriever.invoke(query);
    return { documents: results };
  }

  async function generate(
    question: string,
    docs: DocumentInterface<Record<string, any>>[],
    loop_step: number
  ) {
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

    const generation = await llm.invoke([
      new HumanMessage({ content: rag_prompt_formatted }),
    ]);
    return { generation: generation, loop_step: loop_step + 1 };
  }

  const grade_documents = async (
    question: string,
    docs: DocumentInterface<Record<string, any>>[]
  ) => {
    const filtered_docs = [];
    let web_search = 'No';

    for (const d of docs) {
      console.log(question, d);
      const doc_grader_prompt_formatted = `Here is the retrieved document: \n\n ${d} \n\n Here is the user question: \n\n ${question}.\n\nThis carefully and objectively assess whether the document contains at least some information that is relevant to the question.\n\nReturn JSON with single key, binary_score, that is 'yes' or 'no' score to indicate whether the document contains at least some information that is relevant to the question.`;

      const result = await llm_json_mode.invoke([
        ...[new SystemMessage({ content: doc_grader_instructions })],
        ...[new HumanMessage({ content: doc_grader_prompt_formatted })],
      ]);

      console.log(result.content);
      const grade: string = JSON.parse(result.content.toString()).binary_score;
      console.log(grade);

      if (grade.toLowerCase() == 'yes') {
        console.log('---GRADE: DOCUMENT RELEVANT---');
        filtered_docs.push(d);
      } else {
        console.log('---GRADE: DOCUMENT NOT RELEVANT---');
        // # We do not include the document in filtered_docs
        // # We set a flag to indicate that we want to run web search
        web_search = 'Yes';
        continue;
      }
    }
    return { documents: filtered_docs, web_search: web_search };
  };

  async function web_search(
    question: string,
    docs: DocumentInterface<Record<string, any>>[]
  ) {
    console.log(question, process.env.TAVILY_API_KEY);

    const search = await axios({
      url: `https://api.tavily.com/search`,
      method: 'POST',
      data: {
        query: question,
        api_key: process.env.TAVILY_API_KEY,
      },
    });
    console.log(search.status);
    console.log(search.data);
    // const data = search.data;
    let web_results = search.data.results;
    console.log(web_results);
    web_results = new Document({ pageContent: web_results });
    docs.push(web_results);
    return { documents: docs };
  }

  async function route_question(question: string) {
    // const test_web_search = await llm_json_mode.invoke([
    //   new SystemMessage({ content: routerInstructions }),
    //   new HumanMessage({ content: question }),
    // ]);
    // return test_web_search;

    console.log('---ROUTE QUESTION---');
    const route_question = await llm_json_mode.invoke(
      [new SystemMessage({ content: routerInstructions })].concat([
        new HumanMessage({ content: question }),
      ])
    );
    const source = JSON.parse(route_question.content.toString()).datasource;
    if (source === 'websearch') {
      console.log('---ROUTE QUESTION TO WEB SEARCH---');
      return 'websearch';
    } else if (source === 'vectorstore') {
      console.log('---ROUTE QUESTION TO RAG---');
      return 'vectorstore';
    }
    // return source
  }

  function decide_to_generate(web_search: string) {
    console.log('---ASSESS GRADED DOCUMENTS---');
    // question = state['question'];
    // web_search = state['web_search'];
    // filtered_documents = state['documents'];

    if (web_search == 'Yes') {
      // # All documents have been filtered check_relevance
      // # We will re-generate a new query
      console.log(
        '---DECISION: NOT ALL DOCUMENTS ARE RELEVANT TO QUESTION, INCLUDE WEB SEARCH---'
      );
      return 'websearch';
    } else {
      // # We have relevant documents, so generate answer
      console.log('---DECISION: GENERATE---');
      return 'generate';
    }
  }

  async function grade_generation_v_documents_and_question(
    question: string,
    documents: DocumentInterface<Record<string, any>>[],
    generation: any,
    max_retries: number,
    loop_step: number
  ) {
    console.log('---CHECK HALLUCINATIONS---');
    // question = state["question"]
    // documents = state["documents"]
    // generation = state["generation"]
    // max_retries = state.get("max_retries", 3)  //# Default to 3 if not provided

    // const hallucination_grader_prompt_formatted = hallucination_grader_prompt.format(
    //     documents=format_docs(documents), generation=generation.content
    // )
    const hallucination_grader_prompt_formatted = `FACTS: \n\n ${format_docs(
      documents
    )} \n\n STUDENT ANSWER: ${generation.content.toString()}. \n\nReturn JSON with two keys, binary_score is 'yes' or 'no' score to indicate whether the STUDENT ANSWER is grounded in the FACTS. And a key, explanation, that contains an explanation of the score.`;
    const result = await llm_json_mode.invoke(
      [
        new SystemMessage({ content: hallucination_grader_instructions }),
      ].concat([
        new HumanMessage({ content: hallucination_grader_prompt_formatted }),
      ])
    );
    const grade = JSON.parse(result.content.toString())['binary_score'];

    // # Check hallucination
    if (grade == 'yes') {
      console.log('---DECISION: GENERATION IS GROUNDED IN DOCUMENTS---');
      // # Check question-answering
      console.log('---GRADE GENERATION vs QUESTION---');
      // # Test using question and generation from above
      // const answer_grader_prompt_formatted = answer_grader_prompt.format(
      //     question=question, generation=generation.content
      // )
      const answer_grader_prompt_formatted = `QUESTION: \n\n ${question} \n\n STUDENT ANSWER: ${generation.content}.

Return JSON with two keys, binary_score is 'yes' or 'no' score to indicate whether the STUDENT ANSWER meets the criteria. And a key, explanation, that contains an explanation of the score.`;

      const result = await llm_json_mode.invoke(
        [new SystemMessage({ content: answer_grader_instructions })].concat([
          new HumanMessage({ content: answer_grader_prompt_formatted }),
        ])
      );
      const grade = JSON.parse(result.content.toString())['binary_score'];
      if (grade == 'yes') {
        console.log('---DECISION: GENERATION ADDRESSES QUESTION---');
        return 'useful';
      } else if (loop_step <= max_retries) {
        console.log('---DECISION: GENERATION DOES NOT ADDRESS QUESTION---');
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

  //   const finalQuestion = 'What is Chain of thought prompting?';
  const finalQuestion = 'What is capital of India?';
  const maxRetries = 3;
  const route = await route_question(finalQuestion);
  console.log(route);

  async function doWebSearch(docs = []) {
    for (let i = 0; i < maxRetries; i++) {
      const web_search_results = await web_search(finalQuestion, docs);
      console.log(web_search_results);

      const generation = await generate(finalQuestion, docs, i);
      console.log(generation);

      const grade = await grade_generation_v_documents_and_question(
        finalQuestion,
        web_search_results.documents,
        generation.generation,
        maxRetries,
        i
      );
      console.log(grade);

      if (grade == 'useful' || grade == 'max retries') {
        break;
      } else if (grade == 'not useful') {
        continue;
      } else if (grade == 'not supported') {
        console.log(generation.generation.content);
      }
    }
  }

  if (route == 'websearch') {
    const docs = [];
    // for (let i = 0; i < maxRetries; i++) {
    //   const web_search_results = await web_search(finalQuestion, docs);
    //   console.log(web_search_results);

    //   const generation = await generate(finalQuestion, docs, i);
    //   console.log(generation);

    //   const grade = await grade_generation_v_documents_and_question(
    //     finalQuestion,
    //     web_search_results.documents,
    //     generation.generation,
    //     maxRetries,
    //     i
    //   );
    //   console.log(grade);

    //   if (grade == 'useful' || grade == 'max retries') {
    //     console.log(generation.generation.content);
    //     break;
    //   } else if (grade == 'not useful') {
    //     continue;
    //   } else if (grade == 'not supported') {
    //     // console.log(generation.generation.content);
    //     console.log('Not supported');
    //   }
    // }
    doWebSearch();
  } else if (route == 'vectorstore') {
    const docs = await retrieve(finalQuestion);
    // console.log(docs);
    const grade_docs = await grade_documents(
      finalQuestion,
      format_docs(docs.documents)
    );
    console.log(grade_docs);

    if (grade_docs.web_search == 'Yes') {
      doWebSearch();
    } else {
      const generation = await generate(finalQuestion, docs.documents, 0);
      console.log(generation);

      const grade = await grade_generation_v_documents_and_question(
        finalQuestion,
        docs.documents,
        generation.generation,
        maxRetries,
        0
      );
      console.log(grade);

      if (grade == 'useful' || grade == 'max retries') {
        console.log(generation.generation.content);
      } else if (grade == 'not useful') {
        doWebSearch();
      } else if (grade == 'not supported') {
        // console.log(generation.generation.content);
        console.log('Not supported');
      }
    }
  }
})();
