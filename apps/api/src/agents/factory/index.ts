import { AgentProvider, IAgent } from '../../models/Agent.model';
import { AgentBase } from './base';
import OpenAIAgent from './openai';

class AgentFactory {
  static createAgent(agent: IAgent): AgentBase {
    switch (agent.provider) {
      case AgentProvider.OPENAI:
        return new OpenAIAgent(agent);
      default:
        return null;
    }
  }
}

export default AgentFactory;
