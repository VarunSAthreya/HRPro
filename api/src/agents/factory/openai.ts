/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import axios, { AxiosRequestConfig } from 'axios';
import { Request, Response } from 'express';
import { executeAgent } from '../../controllers/agent.controller';
import { AUTOMATION_PROJECTID } from '../../env';
import { AgentResponseType } from '../../models/Agent.model';
import ThreadModel from '../../models/Thread.model';
import Tools from '../../tools';
import { AgentMessage } from '../../types';
import { automateHTTP, handlePromise } from '../../utils';
import { AgentBase, IAgentExecute } from './base';

// TODO: Implement streaming response
class OpenAIAgent extends AgentBase {
  stream = false;

  createConfig(data: Record<string, any>, stream: boolean): AxiosRequestConfig {
    const { api_key } = JSON.parse(this.agent.auth);
    return {
      method: 'post',
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api_key}`,
      },
      data: {
        ...data,
        stream,
        model: this.agent.model,
        temperature: this.agent.randomness,
      },
      responseType: stream ? 'stream' : 'json',
    };
  }

  async handleResponse(config: AxiosRequestConfig): Promise<any> {
    const { data, status } = await axios(config);
    if (status !== 200) {
      throw new Error(data);
    }
    const response = data.choices[0];
    console.log('response', response);
    console.log('this.threadId', this.threadId);
    if (this.threadId) {
      const messages = [...config.data.messages, response.message];
      await ThreadModel.findOneAndUpdate({ slug: this.threadId }, { messages });
    }
    return response;
  }

  async handleStreamResponse(
    config: AxiosRequestConfig,
    res: Response
  ): Promise<void> {
    res.write(
      JSON.stringify({
        type: 'status',
        data: 'Generating Agent Response',
      })
    );
    const response = await axios(config);
    let finalMessage = '';

    response.data.on('data', (chunk: Buffer) => {
      const messages = chunk
        .toString()
        .split('\n')
        .reduce((acc: string[], line) => {
          line = line.trim();
          if (line && line.startsWith('data: ')) {
            acc.push(line.replace('data: ', ''));
          }
          return acc;
        }, []);

      for (const message of messages) {
        if (message === '[DONE]') return res.end();
        try {
          const parsedMessage = JSON.parse(message).choices[0].delta.content;
          finalMessage += parsedMessage;
          res.write(parsedMessage);
        } catch (err) {
          // console.error('Error parsing message:', err);
        }
      }
    });

    response.data.on('end', () => {
      res.end();
      if (this.threadId) {
        const messages = [
          ...config.data.messages,
          { role: 'assistant', content: finalMessage },
        ];
        ThreadModel.findOneAndUpdate({ slug: this.threadId }, { messages });
      }
    });
    response.data.on('error', (error: Error) => {
      console.error('Stream error:', error);
      res.status(500).send('Stream error');
    });
  }

  async execute(params: IAgentExecute): Promise<any> {
    super.execute(params);

    const { messages, stream, req, res } = params;
    this.stream = stream;

    const preparedMessages = await this.prepareMessages(messages);

    const config = this.createConfig(
      this.agent.abilities.length
        ? await this.prepareData(preparedMessages, req, res)
        : { messages: preparedMessages },
      stream
    );

    if (stream) {
      return this.handleStreamResponse(config, res); // Streaming response: playground
    }
    if (res) {
      return res.send(await this.handleResponse(config)); // JSON response: Automation
    }
    return this.handleResponse(config); // JSON response: Ability
  }

  async isDocsRelevant(docs: string, query: string): Promise<boolean> {
    const response = await this.handleResponse(
      this.createConfig(
        {
          messages: [
            {
              role: 'system',
              content: this.documentRelevancePrompt,
            },
            {
              role: 'user',
              content: `Query: ${query}
                  Document: ${docs}

                  .Produce JSON response.`,
            },
          ],
          response_format: {
            type: 'json_object',
          },
        },
        false
      )
    );
    console.dir(response, { depth: null });
    const res = JSON.parse(response.message.content);
    return res.is_relevant;
  }

  private async prepareMessages(messages: AgentMessage[]): Promise<any[]> {
    const query = messages[messages.length - 1].content;
    const docs = await this.getRAGdata(query);

    if (docs && this.isDocsRelevant(docs, query)) {
      messages[
        messages.length - 1
      ].content = `${docs}.\nAnswer the following question based on the above information.\n${query}`;
    }

    if (this.agent.response_type === AgentResponseType.JSON) {
      messages = messages.map((message) => {
        if (message.role === 'user') {
          return {
            ...message,
            content: `${message.content}. Produce JSON response.`,
          };
        }
        return message;
      });
    }

    if (this.agent.role_setting) {
      messages.unshift({
        role: 'system',
        content: this.agent.role_setting,
      });
    }

    return messages;
  }

  private async prepareData(messages: any[], req: Request, res: Response) {
    const fcSchema = await this.getAbilitySchema();

    let initialData = {
      messages,
      tools: fcSchema,
      tool_choice: 'auto',
    };
    if (this.stream) {
      res.write(
        JSON.stringify({
          type: 'status',
          data: 'Initializing Agent Response',
        })
      );
    }

    let cnt = 1;
    let runFCResult = await this.handleResponse(
      this.createConfig(initialData, false)
    );

    while (runFCResult.message.tool_calls) {
      messages.push(runFCResult.message);

      for (const { function: func, id } of runFCResult.message.tool_calls) {
        const ability =
          this.agent.abilities[Number(func.name.split('_').pop())]; // function_0 -> 0

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
              data: func.arguments,
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

          abilityResponse = JSON.stringify(automationResponse.data);
        } else if (ability.type === 'agent') {
          const prompt = JSON.parse(func.arguments).prompt;
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

          abilityResponse = JSON.stringify(agentResponse);
        } else if (ability.type === 'function') {
          const tool = Tools[ability.id];
          const args = JSON.parse(func.arguments);
          const parameters = tool.func
            .toString()
            .match(/\(([^)]+)\)/)[1]
            .split(',')
            .map((param) => param.trim());
          const result = await tool.func(
            ...parameters.map((param) => args[param])
          );
          abilityResponse = JSON.stringify(result);
        }

        messages.push({
          role: 'tool',
          content: abilityResponse,
          name: func.name,
          tool_call_id: id,
        });
      }

      initialData = { messages, tools: fcSchema, tool_choice: 'auto' };
      runFCResult = await this.handleResponse(
        this.createConfig(initialData, false)
      );
    }

    return { messages };
  }
}

export default OpenAIAgent;
