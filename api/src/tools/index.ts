import axios from 'axios';
import { convert } from 'html-to-text';
import { atsScorer } from './ats/atsScorer';

export default {
  scrape_tool: {
    id: 'scrape_tool',
    name: 'scrape_tool',
    description: 'This tool scrapes data from the given website',
    type: 'function',
    func: async (url: string) => {
      const response = await axios.get(url);
      return {
        data: convert(response.data),
      };
    },
  },
  ats_score: {
    id: 'ats_score',
    name: 'ats_score',
    description:
      'This tool ATS scores the given resume based on Job Description',
    type: 'function',
    func: async (resume: string, jobDescription: string) => {
      // const response = await axios.post('https://api.ats.com/score', {
      //   resume,
      //   jobDescription,
      // });
      // return response.data;
      const response = await atsScorer(jobDescription, resume);
      return response.score;
    },
  },
};
