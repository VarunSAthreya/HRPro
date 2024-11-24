/* eslint-disable no-await-in-loop */
import { GenerativeModel, VertexAI } from '@google-cloud/vertexai';
import { Response } from 'express';
import { executeAgent } from '../../controllers/agent.controller';
import { AUTOMATION_PROJECTID } from '../../env';
import {
  AgentResponseType,
  GeminiResponseTypeMap,
  GeminiRoleMap,
} from '../../models/Agent.model';
import Tools from '../../tools';
import { AgentMessage } from '../../types';
import { automateHTTP, handlePromise } from '../../utils';
import { AgentBase, IAgentExecute } from './base';

class GeminiAgent extends AgentBase {
  stream = false;

  generativeModel: GenerativeModel;

  async handleStreamResponse(config: any, res: Response): Promise<void> {
    if (this.agent.abilities.length === 0) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
    }
    res.write(
      JSON.stringify({
        type: 'status',
        data: 'Generating Agent Response',
      })
    );

    const streamingResult = await this.generativeModel.generateContentStream(
      config
    );

    //clearTimeout(this.timeoutId); // clear timeout to prevent aborting the request

    // eslint-disable-next-line no-restricted-syntax
    for await (const item of streamingResult.stream) {
      res.write(
        item.candidates[0].content.parts
          ? item.candidates[0].content.parts[0].text
          : ''
      );
    }
    res.end();
  }

  async execute(params: IAgentExecute): Promise<any> {
    super.execute(params);
    const { messages, stream, req, res } = params;
    this.stream = stream;

    const serviceAccount = JSON.parse(this.agent.auth);

    const vertexAI = new VertexAI({
      project: serviceAccount.project_id,
      location: 'us-central1',
      googleAuthOptions: {
        credentials: serviceAccount,
      },
    });
    this.generativeModel = vertexAI.getGenerativeModel({
      model: this.agent.model,
      systemInstruction: {
        role: 'system',
        parts: [{ text: this.agent.role_setting ?? '' }],
      },
      generationConfig: {
        temperature: this.agent.randomness,
        responseMimeType: GeminiResponseTypeMap[this.agent.response_type],
      },
    });

    const preparedMessages = await this.prepareMessages(messages);

    console.log('Prepared Messages:', preparedMessages);

    const data = this.agent.abilities.length
      ? await this.prepareData(preparedMessages, req, res)
      : preparedMessages;

    if (stream) {
      return this.handleStreamResponse({ contents: data }, res); // Streaming response: playground
    }
    if (res) {
      return res.send(
        await this.generativeModel.generateContent({
          contents: data,
        }) // JSON response: Automation
      );
    }
    return this.generativeModel.generateContent({ contents: data }); // JSON response: Ability
  }

  private async prepareMessages(messages: AgentMessage[]): Promise<any> {
    const result = [];
    const docs = await this.getRAGdata(messages[messages.length - 1].content);
    const response = await this.generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Query: ${messages[messages.length - 1].content}
            Document: ${docs}
            `,
            },
          ],
        },
      ],
      systemInstruction: {
        role: 'system',
        parts: [
          {
            text: `You are a specialized document relevance assessment agent. Your sole purpose is to determine if a retrieved document is relevant to the given query.

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
- Focus on semantic relevance, not just keyword matching`,
          },
        ],
      },
    });

    console.log('Response:', response);
    const res = JSON.parse(
      response.response.candidates[0].content.parts[0].text
    );
    console.log('Response:', res);

    // messages.map(async (message, index) => {
    for (let index = 0; index < messages.length; index++) {
      const message = messages[index];
      let { content } = message;
      if (index === messages.length - 1) {
        if (docs && res.is_relevant) {
          content = `
            ${docs}.
            Answer the following question based on the above information.
            ${content}
          `;
        }
      }

      if (
        message.role === 'user' &&
        this.agent.response_type === AgentResponseType.JSON
      ) {
        content = `${content}. Produce JSON response.`;
      }

      result.push({
        role: GeminiRoleMap[message.role],
        parts: [{ text: content }],
      });
    }

    return result;
  }

  async prepareData(messages: any, req: any, res: any): Promise<any> {
    const fcSchema = await this.getAbilitySchema();

    let initialData = {
      contents: messages,
      tools: [{ functionDeclarations: fcSchema }],
    };
    console.dir(initialData, { depth: null });

    if (this.stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(
        JSON.stringify({
          type: 'status',
          data: 'Initializing Agent Response',
        })
      );
    }

    let cnt = 1;
    let [error, runFCResult] = await handlePromise(
      this.generativeModel.generateContent(initialData)
    );
    if (error) {
      console.error(error);
      throw new Error('Error in generating agent schema');
    }
    console.log('Run FC Result:', runFCResult);

    while (runFCResult.response.candidates[0].content.parts[0].functionCall) {
      messages.push(runFCResult.response.candidates[0].content);

      const { name, args }: any =
        runFCResult.response.candidates[0].content.parts[0].functionCall;

      const ability = this.agent.abilities[Number(name.split('_').pop())]; // function_0 -> 0
      if (this.stream) {
        res.write(
          JSON.stringify({
            type: 'status',
            data: `Executing Agent Ability #${cnt++} (${ability.type})`,
          })
        );
      }

      let abilityResponse = null;
      if (ability.type === 'automation') {
        console.log('Automation:', ability);
        const rule = await automateHTTP({
          url: `projects/${AUTOMATION_PROJECTID}/rules/${ability.id}`,
          method: 'get',
        });

        console.log('Rule:', rule.data.trigger.id);
        if (!rule) throw new Error('Rule not found');

        const [automationError, automationResponse] = await handlePromise(
          automateHTTP({
            url: `run/${rule.data.trigger.id}`,
            method: 'post',
            data: args,
          })
        );
        console.log('Automation Error:', automationError);
        console.log('Automation Response:', automationResponse.data);

        if (automationResponse.status !== 200) {
          if (this.stream) {
            res.write(
              JSON.stringify({
                type: 'error',
                data: `Error executing Agent Ability: ${automationResponse.data.error}`,
              })
            );
            res.end();
          }
          throw new Error(automationResponse.data.error);
        }

        abilityResponse = automationResponse.data;
        // TODO: Implement automation execution
        // const rule: any = await this.ruleModel
        //   .findOne({ id: ability.id })
        //   .exec();
        // if (!rule) throw new Error('Rule not found');
        // const subAutomationResponse = await this.runService.runPostSync(
        //   rule.trigger.id,
        //   req.id as string,
        //   req.query,
        //   args,
        //   req.headers
        // );
        // if (subAutomationResponse.statusCode !== 200) {
        //   if (this.stream) {
        //     res.write(
        //       JSON.stringify({
        //         type: 'error',
        //         data: `Error executing Agent Ability: ${subAutomationResponse.data.error}`,
        //       })
        //     );
        //     res.end();
        //   }
        //   throw new Error(subAutomationResponse.data.error);
        // }
        // abilityResponse = subAutomationResponse.data;
      } else if (ability.type === 'agent') {
        console.log('func:', args);
        const prompt = args.prompt;
        const [agentResponseError, agentResponse] = await handlePromise(
          executeAgent(
            ability.id,
            [
              {
                role: 'user',
                content: prompt,
              },
            ],
            false
          )
        );
        console.log('Agent Error:', agentResponseError);
        console.log('Agent Response:', agentResponse);

        if (agentResponseError) {
          if (this.stream) {
            res.write(
              JSON.stringify({
                type: 'error',
                data: `Error executing Agent Ability: ${agentResponseError}`,
              })
            );
            res.end();
          }
          throw agentResponseError;
        }

        abilityResponse = agentResponse;
        // TODO: Implement agent execution
        // const [agentResponseError, agentResponse] = await handlePromise(
        //   this.runService.runAgent(
        //     ability.id,
        //     {
        //       messages: [{ role: 'user', content: args.prompt }],
        //       stream: false,
        //     },
        //     null,
        //     null
        //   )
        // );
        // if (agentResponseError) {
        //   if (this.stream) {
        //     res.write(
        //       JSON.stringify({
        //         type: 'error',
        //         data: `Error executing Agent Ability: ${agentResponseError}`,
        //       })
        //     );
        //     res.end();
        //   }
        //   throw agentResponseError;
        // }
        // abilityResponse = agentResponse;
      } else if (ability.type === 'function') {
        // TODO: Implement function execution

        const tool = Tools[ability.id];
        // const args = JSON.parse(func.arguments);
        const parameters = tool.func
          .toString()
          .match(/\(([^)]+)\)/)[1]
          .split(',')
          .map((param) => param.trim());
        console.log('Function:', tool);
        console.log('Parameters:', parameters);
        console.log('Args:', args);
        const result = await tool.func(
          ...parameters.map((param) => args[param])
        );
        console.log('Result:', JSON.stringify(result));
        abilityResponse = result;
      }

      messages.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name,
              response: abilityResponse,
            },
          },
        ],
      });

      initialData = {
        contents: messages,
        tools: [{ functionDeclarations: fcSchema }],
      };

      runFCResult = await this.generativeModel.generateContent(initialData);
    }

    return messages;
  }
}

export default GeminiAgent;
