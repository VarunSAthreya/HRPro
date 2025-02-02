import fs from 'fs';
import path from 'path';
import nlp from 'compromise';
import synonymMap from '../data/synonymMap.json';

interface MatchedSkill {
  resumeWord: string;
  jdWord: string | null;
  matchType: 'Exact' | 'Partial' | 'Synonym' | 'Mentioned';
}

// Extract multi-word phrases
function extractPhrases(text: string): string[] {
  const doc = nlp(text);
  const phrases = doc.match('#Adjective? #Noun+').out('array');
  return phrases.map((phrase: any) => phrase.toLowerCase());
}

const synonymCache: Record<string, string[]> = {};
function expandSynonyms(skill: string): string[] {
  const skillLower = skill.toLowerCase();

  if (synonymCache[skillLower]) {
    return synonymCache[skillLower];
  }
  //@ts-ignore
  const synonyms = synonymMap[skillLower] || [];
  synonymCache[skillLower] = [skill, ...synonyms];
  return [skill, ...synonyms];
}


function precomputeSynonyms(jdSkills: string[]): Set<string> {
  const jdWordsWithSynonyms: Set<string> = new Set();

  jdSkills.forEach((jdWord) => {
    const synonyms = expandSynonyms(jdWord);
    synonyms.forEach((synonym) => jdWordsWithSynonyms.add(synonym));
  });

  return jdWordsWithSynonyms;
}

// Calculate ATS score
function calculateScore(
  jdSkills: string[],
  resumeSkills: string[],
  jdWordWeights: Record<string, number> = {} // Optional weight map for JD skills
): { score: number; matchedSkills: MatchedSkill[] } {
  let matchedCount = 0;
  const matchedSkills: MatchedSkill[] = [];

  const resumeFrequency = countWordFrequency(resumeSkills);
  const jdFrequency = countWordFrequency(jdSkills);

  const jdWordsWithSynonyms = precomputeSynonyms(jdSkills);
  const uniqueResumeWords = Array.from(new Set(resumeSkills.map(skill => skill.toLowerCase())));

  uniqueResumeWords.forEach((resumeWord) => {
    const normalizedResumeWord = resumeWord.toLowerCase();
    if (jdWordsWithSynonyms.has(normalizedResumeWord)) {
      const weight = jdWordWeights[normalizedResumeWord] || 1; // Default weight is 1
      matchedCount += weight * (resumeFrequency[normalizedResumeWord] || 1); // Weighted match
      matchedSkills.push({ resumeWord: normalizedResumeWord, jdWord: normalizedResumeWord, matchType: 'Exact' });
    } else {
      let partialMatchFound = false;
      jdSkills.forEach((jdWord) => {
        if (jdWord.toLowerCase().includes(normalizedResumeWord)) {
          matchedCount += 0.5 * (jdFrequency[jdWord.toLowerCase()] || 1); // Lower score but weighted by frequency
          matchedSkills.push({ resumeWord: normalizedResumeWord, jdWord, matchType: 'Partial' });
          partialMatchFound = true;
        }
      });

      if (!partialMatchFound) {
        matchedCount += 0.1; 
        matchedSkills.push({ resumeWord: normalizedResumeWord, jdWord: null, matchType: 'Mentioned' });
      }
    }
  });

  const relevantResumeWords = uniqueResumeWords.filter((word) => word.length > 3);
  const relevantJdWords = jdSkills.filter((word) => word.length > 3);

  const totalRelevantWords = relevantResumeWords.length + relevantJdWords.length;

  // If no relevant words exist, set score to 0
  if (totalRelevantWords === 0) {
    return { score: 0, matchedSkills };
  }

  const score = (matchedCount / totalRelevantWords) * 100;

  const finalScore = Math.min(Math.max(score, 1), 95);

  return { score: parseFloat(finalScore.toFixed(2)), matchedSkills };
}

// Function to count word frequencies
function countWordFrequency(words: string[]): Record<string, number> {
  const frequencyMap: Record<string, number> = {};
  words.forEach((word) => {
    const normalizedWord = word.toLowerCase();
    frequencyMap[normalizedWord] = (frequencyMap[normalizedWord] || 0) + 1;
  });
  return frequencyMap;
}

export { extractPhrases, expandSynonyms, calculateScore };
