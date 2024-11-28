import axios from 'axios';
import fs from 'fs';
import { OPENAI_API_KEY } from '../env';
// import { ingestData } from '../agents/ragAgent';

const rejectionEmail = fs.readFileSync(
  './src/seeding/rejection_email.txt',
  'utf-8'
);
const selectedEmail = fs.readFileSync(
  './src/seeding/selected_email.txt',
  'utf-8'
);
const scheduleEmail = fs.readFileSync(
  './src/seeding/schedule_email.txt',
  'utf-8'
);
const ragEmailAgent = {
  title: 'Email Agent',
  description: `This is a helpful agent which sends emails to candidates. This agent requires a prompt with the following data: {email: string, subject: string, body: string, status: 'rejection' | 'selected' | 'schedule'}`,
  provider: 'openai',
  model: 'gpt-4o',
  role_setting: `You are a helpful agent acting on behalf of Human Resource depart of Contentstack, which uses the following email template and generate email body based on given data, also update the email template based on the user details provided in the prompt:
  USE THE DATA GIVEN IN THE PROMPT AND DO NOT HALLUCINATE.

    Rejection Email:
    ${rejectionEmail}

    Selected Email:
    ${selectedEmail}

    Schedule Email:
    ${scheduleEmail}

    NOTE: After generating the email body, send the email to the given email address.
    And for schedule email, add the zoom link in the email body using zoom_link tool.
  `,
  auth: `{"api_key":"${OPENAI_API_KEY}"}`,
  response_type: 'text',
  abilities: [
    {
      name: 'send_email',
      id: 'e06453691d8f419e9c79094e62b1507b',
      type: 'automation',
    },
    {
      name: 'zoom_link',
      id: 'zoom_link',
      type: 'function',
    },
  ],
};

const jdTemplate = fs.readFileSync('./src/seeding/jd.txt', 'utf-8');
const jdAgent = {
  title: 'Job Description Agent',
  description: `This is an Agent which generates a job description based on the given data. This agent requires a prompt with the following data: job title, job description, requirements, responsibilities, location.`,
  provider: 'openai',
  model: 'gpt-4o',
  role_setting: `You are a Job Description Agent, specialized in creating and customizing professional job descriptions. Your primary function is to take a base template and enhance it with details provided in the prompt, while maintaining consistency and professional standards.

  Base Template Structure:
    ${jdTemplate}
    `,
  auth: `{"api_key":"${OPENAI_API_KEY}"}`,
  response_type: 'text',
  abilities: [],
};

const validationAgent = {
  title: 'Validation Agent',
  description: `This is a helpful agent which validates the given technical information of any Job Description. `,
  provider: 'openai',
  model: 'gpt-4o',
  role_setting: `You are a technical job requirements validator. Your role is to analyze job descriptions and validate their technical requirements against current industry standards and market realities.

Tools available:
- Web search capability to verify technologies, frameworks, and tools
- Web scraping to analyze similar job postings and market trends

For each job description, you will:
1. Extract all technical requirements (languages, frameworks, tools, years of experience)
2. Validate each requirement by:
   - Confirming technology compatibility (e.g., version conflicts)
   - Checking if experience requirements are realistic
   - Verifying if technology combinations make sense
   - Comparing against industry standards

If you find issues, list them in the following format:
- Requirement: [problematic requirement]
- Issue: [detailed explanation]
- Recommendation: [suggested fix]


Example output:
Requirement: "5 years experience in Rust + 10 years in WebAssembly"
Issue: Timeline inconsistency - WebAssembly was released in 2017
Recommendation: Adjust to "3+ years experience in Rust and WebAssembly"
Follow these protocols:

1. DATA PROCESSING PROTOCOLS:
   - Accept input data in any common format (JSON, text, CSV)
   - Parse and analyze the provided content
   - Identify claims, statements, and factual assertions
   - Flag any numerical data, dates, or statistics for verification
   - Extract proper nouns and specific claims for fact-checking

2. VALIDATION PROCESS:
   - Fact-check information against reliable online sources
   - Verify dates, statistics, and numerical data
   - Cross-reference names, organizations, and locations
   - Scan for profanity and inappropriate content
   - Check for outdated or incorrect information

3. RESPONSE FORMAT:
   Return a JSON object with exactly this structure:
    {
      "validation": true,
      "changes": []
    }
   Where:
   - "validation": true if data is completely accurate and appropriate, false if any issues found
   - "changes": array of strings describing required changes (empty array if validation is true)

4. VALIDATION RULES:
   - Set validation to false if:
     * Any factual inaccuracies are found
     * Profanity or inappropriate content is detected
     * Information is outdated or misleading
     * Required data fields are missing
   - Include in changes array:
     * Clear descriptions of needed corrections
     * Specific issues with profanity or inappropriate content
     * Missing information requirements
     * Format or structure issues

5. RESPONSE GUIDELINES:
   - Keep change descriptions clear and concise
   - List each required change as a separate string in the changes array
   - Return empty changes array if no issues found
   - Include specific corrections when possible

Remember: Your only task is to validate data and return a JSON response in the exact format specified. Do not include any additional fields or modify the response structure.
Always maintain a neutral, factual tone and base conclusions on current market data.`,
  auth: `{"api_key":"${OPENAI_API_KEY}"}`,
  response_type: 'text',
  abilities: [
    {
      name: 'web_search',
      id: 'afee23e7bfab4457b7267f1650ffef9f',
      type: 'automation',
    },
    {
      name: 'scrape_tool',
      id: 'scrape_tool',
      type: 'function',
    },
  ],
};

const atsAgent = {
  title: 'ATS Scoring Agent',
  description: `This is a helpful agent which scores the given Resume based on Job Description. It takes two arguments, JD Text and Resume URL and gives out the score of the resume. Pass the Job Description text as the first argument and the Resume URL as the second argument. Both the JD text and Resume URL should be passed as a json "{\"job_description\": \"your job description\", \"name\":\"name\", \"email\": \"you@example.com\", \"resumeUrl\":\"https://resume.com\"}".`,
  provider: 'openai',
  model: 'gpt-4o',
  role_setting: `
  You are an Applicant Tracking System (ATS) scoring agent. Your role is to evaluate resumes based on job descriptions and assign a score reflecting the candidate's suitability for the role.
  Use the ATS tool to get the ats score for each candidate and provide feedback based on the score and list the candidate in the order of their scores, if there is only one candidate then only score them. DO NOT HALLUCINATE AND ONLY USE THE DATA FROM THE TOOL`,
  auth: `{"api_key":"${OPENAI_API_KEY}"}`,
  response_type: 'text',
  abilities: [
    {
      name: 'ats_score',
      id: 'ats_score',
      type: 'function',
    },
  ],
};

const classifierAgent = {
  title: 'Talent Aquisition Agent',
  description: `This is a helpful agent which classifies the task based the give prompt.`,
  provider: 'openai',
  model: 'gpt-4o',
  auth: `{"api_key":"${OPENAI_API_KEY}"}`,
  response_type: 'text',
  role_setting: `You are a Talent Acquisition Agent, specialized in classifying tasks and job descriptions. Your primary function is to analyze the given prompt and use one or more of the given tools and continuously to help Human Resource depart. DON'T CHANGE THE RESPONSE FROM TOOL AND RETURN IT AS IT IS.`,
  abilities: [
    {
      name: 'publish_job',
      id: 'publish_job',
      type: 'function',
    },
  ],
};

const createAgent = async (agent) => {
  const response = await axios.post('http://localhost:1337/v1/agent', agent);
  return response.data;
};

Promise.all([
  createAgent(ragEmailAgent),
  createAgent(jdAgent),
  createAgent(validationAgent),
  createAgent(atsAgent),
]).then(([rag, jd, validate, ats]) => {
  classifierAgent.abilities.push({
    name: 'rag_email',
    id: rag.data.id,
    type: 'agent',
  });
  classifierAgent.abilities.push({
    name: 'jd_agent',
    id: jd.data.id,
    type: 'agent',
  });
  classifierAgent.abilities.push({
    name: 'validation_agent',
    id: validate.data.id,
    type: 'agent',
  });
  classifierAgent.abilities.push({
    name: 'ats_agent',
    id: ats.data.id,
    type: 'agent',
  });

  createAgent(classifierAgent).then((classifier) => {
    console.log('Classifier Agent created:', classifier.data.id);
  });
});

// const rag = fs.readFileSync('./src/seeding/rag.txt', 'utf-8');
// ingestData(rag);
