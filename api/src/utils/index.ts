import sentencize from '@stdlib/nlp-sentencize';
import axios from 'axios';
import { AUTOMATION_AUTHTOKEN, AUTOMATION_ORGID, AUTOMATION_URL } from '../env';

export async function handlePromise<T>(
  promise: Promise<T>
): Promise<[Error, T]> {
  if (promise && typeof promise.then === 'function') {
    return promise
      .then((data: T) => [undefined, data])
      .catch((err: Error) => [err, undefined]);
  }
  throw new Error('only promise is allowed');
}

export const automateHTTP = axios.create({
  baseURL: AUTOMATION_URL,
  headers: {
    'Content-Type': 'application/json',
    authtoken: AUTOMATION_AUTHTOKEN,
    organization_uid: AUTOMATION_ORGID,
  },
});

export function chunkTextBySentences(
  sourceText: string,
  sentencesPerChunk: number,
  overlap: number
): string[] {
  if (sentencesPerChunk < 2) {
    throw new Error('The number of sentences per chunk must be 2 or more.');
  }
  if (overlap < 0 || overlap >= sentencesPerChunk - 1) {
    throw new Error(
      'Overlap must be 0 or more and less than the number of sentences per chunk.'
    );
  }

  const sentences = sentencize(sourceText);
  if (!sentences) {
    console.log('Nothing to chunk');
    return [];
  }

  const chunks: string[] = [];
  let i = 0;

  while (i < sentences.length) {
    let end = Math.min(i + sentencesPerChunk, sentences.length);
    let chunk = sentences.slice(i, end).join(' ');

    if (overlap > 0 && i > 1) {
      const overlapStart = Math.max(0, i - overlap);
      const overlapEnd = i;
      const overlapChunk = sentences.slice(overlapStart, overlapEnd).join(' ');
      chunk = overlapChunk + ' ' + chunk;
    }

    chunks.push(chunk.trim());

    i += sentencesPerChunk;
  }

  return chunks;
}
