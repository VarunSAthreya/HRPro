import nlp from "compromise";
import synonymMap from "../data/synonymMap.json";

// Interface for matched skills
interface MatchedSkill {
  resumeWord: string;
  jdWord: string | null;
  matchType: "Exact" | "Partial" | "Synonym" | "Mentioned";
}

// Extract multi-word phrases
function extractPhrases(text: string): string[] {
  const doc = nlp(text);
  const phrases = doc.match("#Adjective? #Noun+").out("array");
  return phrases.map((phrase:any) => phrase.toLowerCase());
}

// Synonym expansion with caching
const synonymCache: Record<string, string[]> = {};
async function expandSynonyms(skill: string): Promise<string[]> {
  const skillLower = skill.toLowerCase();

  if (synonymCache[skillLower]) {
    return synonymCache[skillLower];
  }
  //@ts-ignore
  const synonyms = synonymMap[skillLower] || [];
  synonymCache[skillLower] = [skill, ...synonyms];
  return [skill, ...synonyms];
}

// Extract context sentences containing a specific keyword
function extractContext(text: string, keyword: string): string[] {
  const doc = nlp(text);
  const sentences = doc.sentences().json();
  const keywordLower = keyword.toLowerCase();

  return sentences
    .filter((sentence: { text: string }) =>
      sentence.text.toLowerCase().includes(keywordLower)
    )
    .map((sentence: { text: string }) => sentence.text);
}

// Calculate ATS score
function calculateScore(
  jdSkills: string[],
  resumeSkills: string[]
): { score: string; matchedSkills: MatchedSkill[] } {
  let score = 0;
  const matchedSkills: MatchedSkill[] = [];

  const uniqueResumeWords = new Set<string>();
  const uniqueJdWords = new Set<string>();

  // Normalize and extract words from resume skills
  resumeSkills.forEach((skill) => {
    skill
      .toLowerCase()
      .replace(/[\|,.\-]/g, " ")
      .split(" ")
      .filter(Boolean)
      .forEach((word) => uniqueResumeWords.add(word));
  });

  // Normalize and extract words from JD skills
  jdSkills.forEach((skill) => {
    skill
      .toLowerCase()
      .replace(/[\|,.\-]/g, " ")
      .split(" ")
      .filter(Boolean)
      .forEach((word) => uniqueJdWords.add(word));
  });

  uniqueResumeWords.forEach((resumeWord) => {
    let matchFound = false;

    uniqueJdWords.forEach((jdWord) => {
      if (jdWord === resumeWord) {
        // Exact match: Full score
        score += 1.0;
        matchedSkills.push({ resumeWord, jdWord, matchType: "Exact" });
        matchFound = true;
      } else if (jdWord.includes(resumeWord)) {
        // Partial match: Higher score for leniency
        score += 0.75;
        matchedSkills.push({ resumeWord, jdWord, matchType: "Partial" });
        matchFound = true;
      }
    });

    if (!matchFound) {
      expandSynonyms(resumeWord).then((synonyms) => {
        synonyms.forEach((synonym) => {
          if (uniqueJdWords.has(synonym)) {
            score += 0.5; // Synonym match: Generous score
            matchedSkills.push({
              resumeWord,
              jdWord: synonym,
              matchType: "Synonym",
            });
          }
        });
      });

      // Award base points for skills mentioned in resume but not matching
      score += 0.25;
      matchedSkills.push({ resumeWord, jdWord: null, matchType: "Mentioned" });
    }
  });

  const totalPossibleScore = Math.max(
    uniqueResumeWords.size,
    uniqueJdWords.size
  );

  // Calculate lenient percentage score
  const percentage =
    totalPossibleScore > 0 ? (score / totalPossibleScore) * 100 : 0;

  return { score: percentage.toFixed(2), matchedSkills };
}

export { extractPhrases, expandSynonyms, extractContext, calculateScore };
