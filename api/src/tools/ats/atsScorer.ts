import { parsePDF } from "./utils/pdfParser";
import {
  extractPhrases,
  expandSynonyms,
  extractContext,
  calculateScore,
} from './utils/nlpProcessor';
import axios from "axios";
import fs from 'fs';
import path from "path";
import { v4 as uuidv4 } from 'uuid';


interface WeightageMap {
  [key: string]: number;
}

interface ScoreResult {
  score: number;
}


function getGoogleDriveDirectDownloadLink(sharingUrl: string): string {
  // Extract the file ID from the sharing URL
  const match = sharingUrl.match(/\/d\/([^/]+)/);

  if (!match) {
    throw new Error('Invalid Google Drive sharing URL');
  }

  const fileId = match[1];

  // Construct the direct download URL
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

async function downloadPDF(url: string, outputPath: string): Promise<void> {
  try {
    const downloadUrl = url.includes('drive.google.com')
      ? getGoogleDriveDirectDownloadLink(url)
      : url;

    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: {
        'User-Agent': 'Mozilla/5.0',  // Sometimes helps with download restrictions
      }
    });

    const directory = path.dirname(outputPath);
    fs.mkdirSync(directory, { recursive: true });

    await fs.promises.writeFile(outputPath, response.data);

  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
}

function generateUniqueResumeName(initialName:string): string {
  const uniqueId = uuidv4(); 
  return path.join(__dirname, 'data', `${initialName}_${uniqueId}.pdf`);
}

async function atsScorer(
  jdUrl: string,
  resumeUrl: string
): Promise<ScoreResult> {
  const jdPath = generateUniqueResumeName('jd'); ;
  const resumePath = generateUniqueResumeName('resume');

  // Download the JD and Resume PDFs
  await Promise.all([
    downloadPDF(jdUrl, jdPath),
    downloadPDF(resumeUrl, resumePath)
  ]);

  const jdText: string = await parsePDF(jdPath);
  const resumeText: string = await parsePDF(resumePath);

  let jdPhrases: string[] = extractPhrases(jdText);

  // Expand JD Skills with Synonyms
  jdPhrases = (
    await Promise.all(jdPhrases.map((phrase) => expandSynonyms(phrase)))
  ).flat();

  let resumePhrases: string[] = extractPhrases(resumeText);

  // Normalize resume phrases
  resumePhrases = resumePhrases.map((phrase) => phrase.toLowerCase());

  const weightageMap: WeightageMap = {
    javascript: 2,
    "node.js": 2,
    react: 1.5,
    "project management": 3,
  };

  const { score } = calculateScore(
    jdPhrases,
    resumePhrases
  );

  const formattedScore = parseFloat(score);

  return { score: formattedScore };
}


export { atsScorer };
