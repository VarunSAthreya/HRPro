const nlp = require('compromise');
const synonymMap = require('../../../../ats-scorer/data/synonymMap.json');

// Extract multi-word phrases
function extractPhrases(text) {
  const doc = nlp(text);
  const phrases = doc.match('#Adjective? #Noun+').out('array');
  return phrases.map((phrase) => phrase.toLowerCase());
}

// Synonym expansion with caching
const synonymCache = {};
async function expandSynonyms(skill) {
  if (synonymCache[skill.toLowerCase()]) {
    return synonymCache[skill.toLowerCase()];
  }

  const synonyms = synonymMap[skill.toLowerCase()] || [];
  synonymCache[skill.toLowerCase()] = [skill, ...synonyms];
  return [skill, ...synonyms];
}

function extractContext(text, keyword) {
  const doc = nlp(text);
  const sentences = doc.sentences().json();
  const keywordString = String(keyword).toLowerCase();

  return sentences
    .filter((sentence) => sentence.text.toLowerCase().includes(keywordString))
    .map((sentence) => sentence.text);
}

function calculateScore(jdSkills, resumeSkills) {
  let score = 0;
  const matchedSkills = [];

  const uniqueResumeWords = new Set();
  const uniqueJdWords = new Set();

  resumeSkills.forEach((skill) => {
    skill
      .toLowerCase()
      .replace(/[\|,.\-]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .forEach((word) => uniqueResumeWords.add(word));
  });

  jdSkills.forEach((skill) => {
    skill
      .toLowerCase()
      .replace(/[\|,.\-]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .forEach((word) => uniqueJdWords.add(word));
  });

  uniqueResumeWords.forEach((resumeWord) => {
    let matchFound = false;
    uniqueJdWords.forEach((jdWord) => {
      if (jdWord === resumeWord) {
        // Exact match: Full score
        score += 1;
        matchedSkills.push({ resumeWord, jdWord, matchType: 'Exact' });
        matchFound = true;
      } else if (jdWord.includes(resumeWord)) {
        // Partial match: Reduced score
        score += 0.5;
        matchedSkills.push({ resumeWord, jdWord, matchType: 'Partial' });
        matchFound = true;
      }
    });

    if (!matchFound) {
      expandSynonyms(resumeWord).then((synonyms) => {
        synonyms.forEach((synonym) => {
          if (uniqueJdWords.has(synonym)) {
            score += 0.5;
            matchedSkills.push({
              resumeWord,
              jdWord: synonym,
              matchType: 'Synonym',
            });
          }
        });
      });
    }
  });

  const totalPossibleScore = Math.max(
    uniqueResumeWords.size,
    uniqueJdWords.size
  );

  const percentage =
    totalPossibleScore > 0 ? (score / totalPossibleScore) * 100 : 0;

  return { score: percentage.toFixed(2), matchedSkills };
}

module.exports = {
  extractPhrases,
  expandSynonyms,
  extractContext,
  calculateScore,
};
