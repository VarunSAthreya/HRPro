import { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import AgentFactory from '../agents/factory';
import AppError from '../helper/AppError';
import { Agent, Thread } from '../models';
import { IAgent } from '../models/Agent.model';

export const createThread = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, description, agent_id } = req.body;

    const thread = new Thread({
      agent_id,
      slug: nanoid(10),
      title,
      description,
    });

    await thread.save();

    res.status(201).json({
      message: 'Thread created Successfully!',
      data: thread,
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

export const getAllThread = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { agent_id } = req.query;

    console.log(agent_id);

    const threads = await Thread.find({
      agent_id,
    });

    res.status(200).json({
      message: 'Fetched all threads',
      data: threads,
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

export const getThreadById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { thread_id } = req.params;

    const thread = await Thread.findById(thread_id);

    res.status(200).json({
      message: 'Fetch thread by id',
      data: thread,
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

export const executeThread = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { thread_id } = req.params;
    const { messages, stream } = req.body;
    console.log('messages', messages);

    const thread = await Thread.findOne({ slug: thread_id });
    if (!thread) {
      throw Error('Thread not found');
    }
    const agent = await Agent.findOne({ id: thread.agent_id });
    if (!agent) {
      throw Error('Agent not found');
    }

    const combinedMessages = [...thread.messages, ...messages];

    /*
    TODO: Implement agent execution logic here
    */
    const runAgent = AgentFactory.createAgent(agent as IAgent);
    await runAgent.execute({
      messages: combinedMessages,
      stream,
      req,
      res,
    });

    res.status(200).json({
      message: 'Thread executed successfully!',
      data: thread,
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
