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

// TODO: Implement saving the thread messages to the database and streaming response
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

  async isDocsRelevant(docs: string, query: string): Promise<boolean> {
    const response = await this.generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Query: ${query}
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
            text: this.documentRelevancePrompt,
          },
        ],
      },
    });

    const res = JSON.parse(
      response.response.candidates[0].content.parts[0].text
    );
    return res.is_relevant;
  }

  private async prepareMessages(messages: AgentMessage[]): Promise<any> {
    const result = [];
    const docs = await this.getRAGdata(messages[messages.length - 1].content);

    for (let index = 0; index < messages.length; index++) {
      const message = messages[index];
      let { content } = message;
      if (index === messages.length - 1) {
        if (docs && this.isDocsRelevant(docs, content)) {
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
        const rule = await automateHTTP({
          url: `projects/${AUTOMATION_PROJECTID}/rules/${ability.id}`,
          method: 'get',
        });

        if (!rule) throw new Error('Rule not found');

        const [automationError, automationResponse] = await handlePromise(
          automateHTTP({
            url: `run/${rule.data.trigger.id}`,
            method: 'post',
            data: args,
          })
        );

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
      } else if (ability.type === 'agent') {
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
      } else if (ability.type === 'function') {
        const tool = Tools[ability.id];
        const parameters = tool.func
          .toString()
          .match(/\(([^)]+)\)/)[1]
          .split(',')
          .map((param) => param.trim());
        const result = await tool.func(
          ...parameters.map((param) => args[param])
        );
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
