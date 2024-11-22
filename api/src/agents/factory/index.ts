import { AgentProvider, IAgent } from '../../models/Agent.model';
import { AgentBase } from './base';
import GeminiAgent from './gemini';
import OpenAIAgent from './openai';

class AgentFactory {
  static createAgent(agent: IAgent): AgentBase {
    switch (agent.provider) {
      case AgentProvider.GEMINI:
        return new GeminiAgent(agent);
      case AgentProvider.OPENAI:
        return new OpenAIAgent(agent);
      default:
        return null;
    }
  }
}

export default AgentFactory;
