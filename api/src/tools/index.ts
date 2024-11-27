import axios from 'axios';
import { convert } from 'html-to-text';
import atsScorer from './ats';

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
      'This tool ATS scores the given Resume based on Job Description. It takes two arguments, JD Text and Resume URL and gives out the score of the resume. Pass the Job Description text as the first argument and the Resume URL as the second argument.',
    type: 'function',
    func: atsScorer,
  },
};
