const { parsePDF } = require("./utils/pdfParser");
const {
  extractPhrases,
  expandSynonyms,
  extractContext,
  calculateScore,
} = require("./utils/nlpProcessor");

async function atsScorer(jdPath, resumePath) {
  let jdText = await parsePDF(jdPath);
  let resumeText = await parsePDF(resumePath);

  let jdPhrases = extractPhrases(jdText);

  // Expand JD Skills with Synonyms
  jdPhrases = (
    await Promise.all(jdPhrases.map((phrase) => expandSynonyms(phrase)))
  ).flat();

  let resumePhrases = extractPhrases(resumeText);

  resumePhrases = resumePhrases.map((phrase) => phrase.toLowerCase());

  const weightageMap = {
    javascript: 2,
    "node.js": 2,
    react: 1.5,
    "project management": 3,
  };

  const { score, matchedSkills } = calculateScore(
    jdPhrases,
    resumePhrases,
    weightageMap
  );

  return { score };
}



module.exports = {
  atsScorer
};


