import express from 'express';
import {
  createAgent,
  deleteAgent,
  getAgentById,
  getAllAgents,
  ingestData,
  updateAgent,
} from '../controllers/agent.controller';
import {
  createThread,
  executeThread,
  getAllThread,
  getThreadById,
} from '../controllers/thread.controller';
const router = express.Router();

router.route('/agent').get(getAllAgents).post(createAgent);
router
  .route('/agent/:agent_id')
  .get(getAgentById)
  .put(updateAgent)
  .delete(deleteAgent);
router.route('/agent/:agent_id/ingest').post(ingestData);

// router.route('/').get(getAllEvents).post(createEvent);
router.route('/thread').get(getAllThread).post(createThread);
router.route('/thread/:thread_id').get(getThreadById).post(executeThread);

// router.route('/:id').get(getEventById).put(updateEvent).delete(deleteEvent);

export default router;
