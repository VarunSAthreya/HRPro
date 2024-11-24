/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import axios, { AxiosRequestConfig } from 'axios';
import { Request, Response } from 'express';
import { executeAgent } from '../../controllers/agent.controller';
import { AUTOMATION_PROJECTID } from '../../env';
import { AgentResponseType } from '../../models/Agent.model';
import Tools from '../../tools';
import { AgentMessage } from '../../types';
import { automateHTTP, handlePromise } from '../../utils';
import { AgentBase, IAgentExecute } from './base';

class OpenAIAgent extends AgentBase {
  stream = false;

  createConfig(data: Record<string, any>, stream: boolean): AxiosRequestConfig {
    console.log('Auth:', this.agent.auth);
    const { api_key } = JSON.parse(this.agent.auth);
    console.log('API Key:', api_key);
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
    // console.dir(config, { depth: null });
    const { data, status } = await axios(config);
    if (status !== 200) {
      throw new Error(data);
    }
    return data.choices[0];
  }

  async handleStreamResponse(
    config: AxiosRequestConfig,
    res: Response
  ): Promise<void> {
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
    const response = await axios(config);
    // clearTimeout(this.timeoutId); // clear timeout to prevent aborting the request

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
          res.write(JSON.parse(message).choices[0].delta.content);
        } catch (err) {
          // console.error('Error parsing message:', err);
        }
      }
    });

    response.data.on('end', () => res.end());
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

  private async prepareMessages(messages: AgentMessage[]): Promise<any[]> {
    const query = messages[messages.length - 1].content;
    const docs = await this.getRAGdata(query);
    // TODO: Optimize RAG relevancy check
    const response = await this.handleResponse(
      this.createConfig(
        {
          messages: [
            {
              role: 'system',
              content: `You are a specialized document relevance assessment agent. Your sole purpose is to determine if a retrieved document is relevant to the given query.

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
- Don't add any formatting just the JSON response
- No additional fields in the response
- No natural language responses
- Focus on semantic relevance, not just keyword matching`,
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
    console.log('Response:', res);

    if (docs && res.is_relevant) {
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

    console.log('Messages:', messages);
    return messages;
  }

  private async prepareData(messages: any[], req: Request, res: Response) {
    const fcSchema = await this.getAbilitySchema();

    console.log(JSON.stringify(fcSchema, null, 2));

    let initialData = {
      messages,
      tools: fcSchema,
      tool_choice: 'auto',
    };
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
              data: func.arguments,
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

          abilityResponse = JSON.stringify(automationResponse.data);
        } else if (ability.type === 'agent') {
          console.log('func:', func.arguments);
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

          abilityResponse = JSON.stringify(agentResponse);
        } else if (ability.type === 'function') {
          // TODO: Create logic to execute function
          const tool = Tools[ability.id];
          const args = JSON.parse(func.arguments);
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
          console.log('Result:', result);
          abilityResponse = result;
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
