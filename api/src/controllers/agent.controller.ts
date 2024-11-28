import { ChromaClient } from 'chromadb';
import { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import ollama from 'ollama';
import AgentFactory from '../agents/factory';
import { execute } from '../agents/ragAgent';
import { EMBED_MODEL } from '../env';
import AppError from '../helper/AppError';
import { Agent } from '../models';
import { IAgent } from '../models/Agent.model';
import { AgentMessage } from '../types';
import { chunkTextBySentences } from '../utils';

export const createAgent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const body = {
      ...req.body,
      id: nanoid(15),
    };
    const agent = new Agent(body);
    await agent.save();

    res.status(201).json({
      message: 'Agent created Successfully!',
      data: agent,
    });
  } catch (err: any) {
    next(
      new AppError({
        message: err.message || 'Server error occurred!',
        statusCode: err.statusCode || 400,
        stack: err.stack || '',
      })
    );
  }
};

export const getAllAgents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const agents = await Agent.find();

    res.status(200).json({
      message: 'Fetched all agents',
      data: agents,
    });
  } catch (err: any) {
    next(
      new AppError({
        message: err.message || 'Server error occurred!',
        statusCode: err.statusCode || 400,
        stack: err.stack || '',
      })
    );
  }
};

export const getAgentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { agent_id } = req.params;

    const agent = await Agent.findOne({ id: agent_id });

    res.status(200).json({
      message: 'Fetch agent by id',
      data: agent,
    });
  } catch (err: any) {
    next(
      new AppError({
        message: err.message || 'Server error occurred!',
        statusCode: err.statusCode || 400,
        stack: err.stack || '',
      })
    );
  }
};

export const updateAgent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { agent_id } = req.params;

    const agent = await Agent.findOneAndUpdate({ id: agent_id }, req.body, {
      new: true,
    });

    res.status(200).json({
      message: 'Agent updated successfully!',
      data: agent,
    });
  } catch (err: any) {
    next(
      new AppError({
        message: err.message || 'Server error occurred!',
        statusCode: err.statusCode || 400,
        stack: err.stack || '',
      })
    );
  }
};

export const deleteAgent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { agent_id } = req.params;

    await Agent.findOneAndDelete({ id: agent_id });

    res.status(200).json({
      message: 'Agent deleted successfully!',
    });
  } catch (err: any) {
    next(
      new AppError({
        message: err.message || 'Server error occurred!',
        statusCode: err.statusCode || 400,
        stack: err.stack || '',
      })
    );
  }
};

export const ingestData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { agent_id } = req.params;

    const agent = await Agent.findOne({ id: agent_id });
    if (!agent) {
      throw new Error('Agent not found');
    }
    const chroma = new ChromaClient();
    // await chroma.deleteCollection({ name: agent_id });
    const collection = await chroma.getOrCreateCollection({
      name: agent_id,
      metadata: { 'hnsw:space': 'cosine' },
    });
    const chunks = chunkTextBySentences(req.body.content, 10, 1);

    for await (const [_, chunk] of chunks.entries()) {
      const embed = (
        await ollama.embeddings({ model: EMBED_MODEL, prompt: chunk })
      ).embedding;
      await collection.add({
        ids: [agent_id + '-' + nanoid(10)],
        embeddings: [embed],
        metadatas: [{ source: 'user' }],
        documents: [chunk],
      });
    }

    res.status(201).json({
      message: 'Data ingestion done successfully!',
    });
  } catch (err: any) {
    next(
      new AppError({
        message: err.message || 'Server error occurred!',
        statusCode: err.statusCode || 400,
        stack: err.stack || '',
      })
    );
  }
};

export const executeAgent = async (
  agent_id: string,
  messages: AgentMessage[],
  stream: boolean
) => {
  const agent = await Agent.findOne({ id: agent_id });
  if (!agent) {
    throw new Error('Agent not found');
  }

  const agentFactory = AgentFactory.createAgent(agent as IAgent);
  return await agentFactory.execute({
    messages,
    stream,
    req: null,
    res: null,
  });
};

export const ragAgent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { messages } = req.body;
    const content = messages
      .map((message: any) => message.content)
      .join('\n\n');

    res.status(200).json({
      message: 'RAG Agent executed successfully!',
      data: await execute(content),
    });
  } catch (err: any) {
    next(
      new AppError({
        message: err.message || 'Server error occurred!',
        statusCode: err.statusCode || 400,
        stack: err.stack || '',
      })
    );
  }
};
