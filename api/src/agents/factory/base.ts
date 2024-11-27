/* eslint-disable @typescript-eslint/naming-convention */
import { ChromaClient } from 'chromadb';
import { Request, Response } from 'express';
import ollama from 'ollama';
import { AUTOMATION_PROJECTID, EMBED_MODEL } from '../../env';
import AgentModel, {
  AgentProvider,
  AutomateProviderMap,
  IAgent,
} from '../../models/Agent.model';
import Tools from '../../tools';
import generateFunctionSchema from '../../tools/schema';
import { AgentMessage } from '../../types';
import { automateHTTP, handlePromise } from '../../utils';

export type IAgentExecute = {
  messages: AgentMessage[];
  stream: boolean;
  threadId?: string;
  req: Request;
  res: Response;
};

export abstract class AgentBase {
  agent: IAgent;
  threadId?: string;

  constructor(agent: IAgent) {
    this.agent = agent;
  }

  documentRelevancePrompt: `
  You are a specialized document relevance assessment agent. Your sole purpose is to determine if a retrieved document is relevant to the given query.

    Your task:
    1. Analyze the semantic relationship between the query and the document
    2. Look for direct or indirect topical connections
    3. Consider context and implications
    4. Make a binary relevance decision
    5. Respond ONLY in valid JSON format with a single boolean field "is_relevant"

    Guidelines for relevance assessment:
    - Document must contain information that helps answer the query
    - Mere keyword matches are not sufficient for relevance
    - Consider synonyms and related concepts
    - Documents that are tangentially related should be marked as not relevant
    - When in doubt, err on the side of marking as not relevant
    - Technical or domain-specific terms should be understood in their proper context

    Response format requirements:
    - Must be valid JSON
    - Must contain exactly one field: "is_relevant"
    - Value must be boolean (true/false)
    - No additional explanations or text
    - No comments or metadata

    Example scenarios:

    Query: "What is the capital of France?"
    Document: "Paris is the capital and largest city of France, known for the Eiffel Tower."
    Response: {"is_relevant": true}

    Query: "What is the capital of France?"
    Document: "France is known for its wine and cheese production in regions like Bordeaux."
    Response: {"is_relevant": false}

    Remember:
    - Always maintain strict JSON formatting
    - No explanation of your reasoning
    - No additional fields in the response
    - No natural language responses
    - Focus on semantic relevance, not just keyword matching
  `;

  abstract isDocsRelevant(docs: string, query: string): Promise<boolean>;

  execute(params: IAgentExecute) {
    this.threadId = params.threadId;
  }

  private async generateFunctionCallingSchema(
    agentIds: string[],
    names: string[],
    provider: AgentProvider
  ): Promise<any> {
    let [agentsError, agents]: any = await handlePromise(
      AgentModel.find({ id: { $in: agentIds } })
    );

    if (agentsError) {
      throw new Error('Error in fetching agents');
    }
    agents = agentIds.map((agentId) =>
      agents.find((doc) => doc.id === agentId)
    );

    return agents.map((agent, ind) => {
      const data = {
        name: names[ind],
        description: agent.description,
        parameters: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
            },
          },
          required: ['prompt'],
        },
      };

      switch (provider) {
        case AgentProvider.OPENAI:
          return {
            type: 'function',
            function: data,
          };
        case AgentProvider.GEMINI:
          return data;

        default:
          return null;
      }
    });
  }

  async getRAGdata(query: string) {
    const chroma = new ChromaClient();
    const collection = await chroma.getOrCreateCollection({
      name: this.agent.id,
      metadata: { 'hnsw:space': 'cosine' },
    });

    const queryembed = (
      await ollama.embeddings({ model: EMBED_MODEL, prompt: query })
    ).embedding;

    const relevantDocs = (
      await collection.query({ queryEmbeddings: [queryembed], nResults: 5 })
    ).documents[0];

    if (relevantDocs.length) {
      return relevantDocs.join('\n\n');
    }

    return null;
  }

  async getAbilitySchema(): Promise<any> {
    const { abilities, provider } = this.agent;

    const agentNames: any[] = [];
    const agentIds: any[] = [];
    const ruleIds: any[] = [];
    const ruleNames: any[] = [];
    const functionNames: any[] = [];
    const functionIds: any[] = [];

    abilities.forEach((ability, index) => {
      if (ability.type === 'agent') {
        agentIds.push(ability.id);
        agentNames.push(`function_${index}`);
      } else if (ability.type === 'automation') {
        ruleIds.push(ability.id);
        ruleNames.push(`function_${index}`);
      } else if (ability.type === 'function') {
        functionIds.push(ability.id);
        functionNames.push(`function_${index}`);
      }
    });

    const [agentSchemaError, agentSchema] = await handlePromise(
      this.generateFunctionCallingSchema(agentIds, agentNames, provider)
    );
    if (agentSchemaError) {
      throw new Error('Error in generating agent schema');
    }

    let [ruleSchemaError, ruleSchema] = await handlePromise(
      automateHTTP({
        method: 'post',
        url: `projects/${AUTOMATION_PROJECTID}/rules/functioncalling/${AutomateProviderMap[provider]}/schema`,
        data: JSON.stringify(ruleIds),
      })
    );
    if (ruleSchemaError) {
      throw new Error('Error in generating rule schema');
    }
    let resultSchema = ruleSchema.data.map((schema) => {
      if (provider === AgentProvider.GEMINI) {
        schema.function.name =
          ruleNames[ruleIds.indexOf(schema.function.name.split('-')[2])];
      } else {
        schema.function.name = ruleNames[ruleIds.indexOf(schema.function.name)];
      }
      return schema;
    });

    const functionSchema = functionIds.map((id, index) => {
      const data = Tools[id];
      return {
        type: 'function',
        function: generateFunctionSchema(
          data.func,
          data.description,
          functionNames[index]
        ),
      };
    });

    switch (provider) {
      case AgentProvider.OPENAI:
        return [...agentSchema, ...resultSchema, ...functionSchema];
      case AgentProvider.GEMINI: {
        const modifiedRuleSchema = resultSchema.map(
          (schema) => schema.function
        );
        const modifiedFunctionSchema = functionSchema.map(
          (schema) => schema.function
        );
        return [
          ...agentSchema,
          ...modifiedRuleSchema,
          ...modifiedFunctionSchema,
        ];
      }
      default:
        return null;
    }
  }
}
