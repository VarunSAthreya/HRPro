import axios from 'axios';
import fs from 'fs';
import { nanoid } from 'nanoid';
import path from 'path';
import {
  calculateScore,
  expandSynonyms,
  extractPhrases,
} from './utils/nlpProcessor';
import parsePdf from './utils/pdfParser';

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
    // Convert Google Drive sharing URL to direct download link if needed
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
        'User-Agent': 'Mozilla/5.0', // Sometimes helps with download restrictions
      },
    });

    // Ensure the directory exists
    const directory = path.dirname(outputPath);
    fs.mkdirSync(directory, { recursive: true });

    // Write the file
    await fs.promises.writeFile(outputPath, response.data);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
}

function generateUniqueResumeName(initialName: string): string {
  const uniqueId = nanoid(15);
  return path.join(__dirname, '../metadata', `${initialName}_${uniqueId}.pdf`);
}

async function atsScorer(
  jdUrl: string,
  resumeUrl: string
): Promise<ScoreResult> {
  let jdText = '';
  let resumeText = '';

  const jdPath = generateUniqueResumeName('jd');
  const resumePath = generateUniqueResumeName('resume');
  const outdir = path.join(__dirname, '../metadata');

  if (jdUrl.startsWith('http')) {
    await Promise.all([
      downloadPDF(jdUrl, jdPath),
      downloadPDF(resumeUrl, resumePath),
    ]);

    [jdText, resumeText] = await Promise.all([
      parsePdf(jdPath, outdir),
      parsePdf(resumePath, outdir),
    ]);
  } else {
    jdText = jdUrl;
    await downloadPDF(resumeUrl, resumePath);

    resumeText = await parsePdf(resumePath, outdir);
  }

  let jdPhrases: string[] = extractPhrases(jdText);

  jdPhrases = (
    await Promise.all(jdPhrases.map((phrase) => expandSynonyms(phrase)))
  ).flat();

  let resumePhrases: string[] = extractPhrases(resumeText);

  // Normalize resume phrases
  resumePhrases = resumePhrases.map((phrase) => phrase.toLowerCase());

  const { score, matchedSkills } = calculateScore(jdPhrases, resumePhrases);

  const formattedScore = score;

  return { score: formattedScore };
}

export default atsScorer;
