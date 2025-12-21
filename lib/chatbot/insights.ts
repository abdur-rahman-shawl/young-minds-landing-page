import crypto from 'crypto';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { aiChatbotMessageInsights } from '@/lib/db/schema';

const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

const QUESTION_KEYWORDS = ['who', 'what', 'where', 'when', 'why', 'how', 'which', 'can', 'should', 'do', 'does', 'is', 'are', 'will', 'could', 'would'];
const DIRECTIVE_PREFIXES = [
  'tell me',
  'show me',
  'give me',
  'share',
  'list',
  'recommend',
  'suggest',
  'please tell me',
  'please share',
  'please give me',
  'please provide',
  'please suggest',
  'please recommend',
];
const UNIVERSITY_SUFFIXES = ['university', 'college', 'institute', 'school'];
const COMPARISON_KEYWORDS = ['compare', 'comparison', 'vs', 'vs.', 'versus', 'better than', 'difference between', 'compare between'];
const NON_NAME_PREFIXES = new Set([
  ...QUESTION_KEYWORDS,
  'tell',
  'please',
  'show',
  'give',
  'share',
  'list',
  'recommend',
  'suggest',
  'looking',
  'searching',
  'need',
  'want',
  'opt',
  'choose',
  'plan',
  'i',
  'info',
  'information',
  'details',
  'more',
  'me',
  'about',
  'please',
  'kindly',
]);
const UNIVERSITY_CONNECTORS = new Set(['of', 'at', 'in', 'for', 'de', 'di', 'la', 'le', 'los', 'las', 'the', 'to', 'and', '&']);
const UNIVERSITY_NAME_PATTERN =
  /\b[A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*)*\s+(?:University|College|Institute|School)(?:\s+(?:of|at|in|de|di|the|for)\s+[A-Z][\w&'.-]*)*(?:\s+[A-Z][\w&'.-]*)*\b|\b(?:University|College|Institute|School)\s+(?:of|at|in|de|di|the|for)\s+[A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*)*\b/g;
const UNIVERSITY_LEADING_STOP_WORDS = new Set([
  'a',
  'an',
  'about',
  'any',
  'are',
  'around',
  'can',
  'could',
  'details',
  'do',
  'does',
  'find',
  'give',
  'help',
  'how',
  'if',
  'info',
  'information',
  'in',
  'is',
  'learn',
  'list',
  'looking',
  'me',
  'more',
  'need',
  'on',
  'opt',
  'please',
  'provide',
  'recommend',
  'searching',
  'share',
  'should',
  'show',
  'some',
  'tell',
  'that',
  'the',
  'these',
  'those',
  'to',
  'want',
  'was',
  'were',
  'what',
  'which',
  'why',
  'whether',
  'would',
]);
const UNIVERSITY_SEARCH_KEYWORDS = [
  'best',
  'top',
  'recommend',
  'suggest',
  'apply',
  'admission',
  'looking for',
  'searching',
  'choose',
  'options',
  'where',
  'which',
  'should i',
  'want to study',
  'plan to study',
  'tell me about',
  'learn about',
  'info about',
  'details about',
  'compare',
  'comparison',
  'difference between',
  'versus',
  'vs',
  'vs.',
  'better than',
];

type InsightIntent = 'question' | 'university_search' | 'general';
type InsightSource = 'heuristic' | 'llm';

interface ExtractedInsight {
  shouldPersist: boolean;
  isQuestion: boolean;
  intent: InsightIntent;
  questionText: string | null;
  questionHash: string | null;
  universities: string[];
  source: InsightSource;
}

const QUESTION_KEYWORD_SET = new Set(QUESTION_KEYWORDS);

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const computeHash = (value: string) => crypto.createHash('sha1').update(value).digest('hex');

const splitSentences = (raw: string): string[] => {
  return raw
    .split(/(?<=[.?!])\s+|[\n\r]+/g)
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean);
};

const hasComparisonIntent = (value: string) => {
  const lower = value.toLowerCase();
  return COMPARISON_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const ensureQuestionMark = (value: string) => (value.endsWith('?') ? value : `${value}?`);

const isDirectiveSentence = (value: string) => {
  const lower = value.toLowerCase().trim();
  for (const prefix of DIRECTIVE_PREFIXES) {
    if (lower.startsWith(prefix) || lower.startsWith(`${prefix}?`)) {
      return true;
    }
  }
  return false;
};

const PERSONAL_CONTEXT_PATTERN = /\b(i am|i'm|im|i have|i currently|my|me|mine|myself|we|our|ours)\b/i;
const CONTEXT_KEYWORD_PATTERN = /\b(study|studying|pursuing|course|degree|graduation|background|experience|working|career|college|school|major)\b/i;

const shouldAttachContext = (sentence: string) => {
  if (!sentence) return false;
  if (sentence.length > 220) return false;
  return PERSONAL_CONTEXT_PATTERN.test(sentence) || CONTEXT_KEYWORD_PATTERN.test(sentence);
};

const buildContextualQuestionFromSentences = (
  sentences: string[],
  questionIndex: number,
  normalizedQuestion: string,
) => {
  for (let i = questionIndex - 1; i >= 0; i--) {
    const candidate = sentences[i]?.trim();
    if (!candidate) continue;
    if (candidate.endsWith('?')) break;
    if (!shouldAttachContext(candidate)) continue;
    return normalizeWhitespace(`${candidate} ${normalizedQuestion}`);
  }
  return normalizedQuestion;
};

const normalizeForComparison = (value: string) => value.replace(/[?]/g, '').toLowerCase().trim();

const buildContextualQuestionFromRaw = (raw: string, normalizedQuestion: string) => {
  const sentences = splitSentences(raw);
  const normalizedTarget = normalizeForComparison(normalizedQuestion);

  if (!sentences.length || !normalizedTarget) {
    return normalizedQuestion;
  }

  const index = sentences.findIndex((sentence) => {
    const normalizedSentence = normalizeForComparison(sentence);
    if (!normalizedSentence) return false;
    return normalizedSentence === normalizedTarget || normalizedSentence.includes(normalizedTarget) || normalizedTarget.includes(normalizedSentence);
  });

  if (index === -1) {
    return normalizedQuestion;
  }

  return buildContextualQuestionFromSentences(sentences, index, normalizedQuestion);
};

const detectQuestion = (
  raw: string,
): { isQuestion: boolean; normalizedQuestion: string | null; contextualQuestion: string | null } => {
  const sentences = splitSentences(raw);
  if (!sentences.length) return { isQuestion: false, normalizedQuestion: null, contextualQuestion: null };

  for (let index = 0; index < sentences.length; index++) {
    const sentence = sentences[index];
    const lower = sentence.toLowerCase();
    if (isDirectiveSentence(lower)) {
      continue;
    }
    const startsWithQuestionWord = QUESTION_KEYWORDS.some((word) => lower.startsWith(`${word} `) || lower.startsWith(`${word}?`));
    const hasQuestionMark = sentence.includes('?');
    const comparisonCommand = hasComparisonIntent(lower);

    if (startsWithQuestionWord || hasQuestionMark || comparisonCommand) {
      const normalized = ensureQuestionMark(sentence);
      const contextualQuestion = buildContextualQuestionFromSentences(sentences, index, normalized);
      return { isQuestion: true, normalizedQuestion: normalized, contextualQuestion };
    }
  }

  if (hasComparisonIntent(raw)) {
    const normalized = ensureQuestionMark(normalizeWhitespace(raw));
    const contextualQuestion = buildContextualQuestionFromRaw(raw, normalized);
    return { isQuestion: true, normalizedQuestion: normalized, contextualQuestion };
  }

  return { isQuestion: false, normalizedQuestion: null, contextualQuestion: null };
};

const normalizeUniversityName = (value: string) => {
  const words = value
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9?!.]+$/g, '')
    .split(' ')
    .filter(Boolean);

  while (words.length && UNIVERSITY_LEADING_STOP_WORDS.has(words[0].toLowerCase())) {
    words.shift();
  }

  const cleaned = words.join(' ').trim().replace(/[?!.]+$/g, '').trim();
  if (!cleaned) return value.trim();
  return cleaned.replace(/\b(university|college|institute|school)\b/gi, (match) => match[0].toUpperCase() + match.slice(1).toLowerCase());
};

const isLikelyUniversityName = (value: string) => {
  const words = value.split(' ').filter(Boolean);
  if (words.length < 2) return false;

  const lowerWords = words.map((word) => word.toLowerCase());
  const suffixIndex = lowerWords.findIndex((word) => UNIVERSITY_SUFFIXES.includes(word));
  if (suffixIndex === -1) return false;

  const firstLower = lowerWords[0];
  if (NON_NAME_PREFIXES.has(firstLower) || UNIVERSITY_LEADING_STOP_WORDS.has(firstLower)) {
    return false;
  }

  const precedingMeaningful = words
    .slice(0, suffixIndex)
    .some((word) => /^[A-Z]/.test(word) && !NON_NAME_PREFIXES.has(word.toLowerCase()));

  const trailingWords = words.slice(suffixIndex + 1);
  let firstTrailingMeaningful: string | null = null;
  for (const word of trailingWords) {
    const lower = word.toLowerCase();
    if (!lower) continue;
    if (UNIVERSITY_CONNECTORS.has(lower)) continue;
    if (NON_NAME_PREFIXES.has(lower)) break;
    firstTrailingMeaningful = word;
    break;
  }
  const trailingMeaningful = firstTrailingMeaningful ? /^[A-Z]/.test(firstTrailingMeaningful) : false;

  if (suffixIndex === 0 && !trailingMeaningful) {
    return false;
  }

  if (!precedingMeaningful && !trailingMeaningful) {
    return false;
  }

  return true;
};

const detectUniversities = (raw: string): string[] => {
  const matches = new Set<string>();
  const candidateMatches = raw.matchAll(UNIVERSITY_NAME_PATTERN);

  for (const match of candidateMatches) {
    const normalized = normalizeWhitespace(match[0]);
    if (!normalized) continue;
    if (!UNIVERSITY_SUFFIXES.some((suffix) => normalized.toLowerCase().includes(suffix))) continue;
    const cleaned = normalizeUniversityName(normalized);
    if (!cleaned) continue;
    if (!isLikelyUniversityName(cleaned)) continue;
    matches.add(cleaned);
  }

  return Array.from(matches).slice(0, 5);
};

const buildUniversitiesHash = (universities: string[]) => {
  if (!universities.length) return null;
  const normalized = [...universities].map((name) => name.toLowerCase());
  normalized.sort();
  return computeHash(normalized.join('|'));
};

export const extractChatInsight = (content: string): ExtractedInsight => {
  const { isQuestion, normalizedQuestion, contextualQuestion } = detectQuestion(content);
  const universities = detectUniversities(content);
  const lowerContent = content.toLowerCase();
  const hasUniversitySearchCue = UNIVERSITY_SEARCH_KEYWORDS.some((keyword) => lowerContent.includes(keyword));
  const shouldLogUniversitySearch = universities.length > 0 && (hasUniversitySearchCue || isQuestion);

  const intent: InsightIntent = shouldLogUniversitySearch
    ? 'university_search'
    : isQuestion
      ? 'question'
      : 'general';

  return {
    shouldPersist: isQuestion || shouldLogUniversitySearch,
    isQuestion,
    intent,
    questionText: contextualQuestion ?? normalizedQuestion,
    questionHash: normalizedQuestion ? computeHash(normalizedQuestion.toLowerCase()) : null,
    universities: shouldLogUniversitySearch ? universities : [],
    source: 'heuristic',
  };
};

const classificationSchema = z.object({
  isQuestion: z.boolean().default(false),
  normalizedQuestion: z.string().nullable().optional(),
  universities: z.array(z.string()).optional().default([]),
  intent: z.enum(['question', 'university_search', 'general']).default('general'),
});

const normalizeUniversities = (items: string[] = []) =>
  items
    .map((item) => normalizeUniversityName(normalizeWhitespace(item)))
    .filter(Boolean)
    .slice(0, 5);

async function classifyWithLlm(content: string): Promise<ExtractedInsight | null> {
  if (!GOOGLE_API_KEY) return null;
  try {
    const result = await generateObject({
      model: google('gemini-2.5-flash', { apiKey: GOOGLE_API_KEY }),
      temperature: 0,
      schema: classificationSchema,
      system: `You classify mentorship chat messages.
Decide if the user is asking a question or searching for universities.
Return normalized question text if it exists, and list any universities mentioned.`,
      prompt: `Message:
"""
${content}
"""

Respond in JSON according to the schema.`,
    });

    const payload = result.object;
    const normalizedQuestion = payload.normalizedQuestion ? ensureQuestionMark(normalizeWhitespace(payload.normalizedQuestion)) : null;
    const contextualQuestion =
      normalizedQuestion && payload.isQuestion ? buildContextualQuestionFromRaw(content, normalizedQuestion) : normalizedQuestion;
    const universities = normalizeUniversities(payload.universities ?? []);
    const intent: InsightIntent =
      payload.intent === 'university_search'
        ? 'university_search'
        : payload.isQuestion
          ? 'question'
          : universities.length
            ? 'university_search'
            : 'general';

    return {
      shouldPersist: payload.isQuestion || intent === 'university_search',
      isQuestion: payload.isQuestion,
      intent,
      questionText: contextualQuestion,
      questionHash: normalizedQuestion ? computeHash(normalizedQuestion.toLowerCase()) : null,
      universities,
      source: 'llm',
    };
  } catch (error) {
    console.error('[chatbot-insights] LLM classification failed', error);
    return null;
  }
};

const shouldUseLlmFallback = (content: string, heuristic: ExtractedInsight) => {
  if (heuristic.shouldPersist) return false;
  if (!GOOGLE_API_KEY) return false;
  const trimmed = content.trim();
  if (!trimmed) return false;
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount >= 3) return true;
  if (/[?]/.test(trimmed)) return true;
  if (/(university|college|institute|school|signup|mentor|admission)/i.test(trimmed)) return true;
  return false;
};

interface RecordInsightArgs {
  messageId: string;
  chatSessionId: string;
  userId?: string | null;
  content: string;
}

export async function recordChatInsight(args: RecordInsightArgs) {
  let insight = extractChatInsight(args.content);

  if (!insight.shouldPersist && shouldUseLlmFallback(args.content, insight)) {
    const llmInsight = await classifyWithLlm(args.content);
    if (llmInsight?.shouldPersist) {
      insight = llmInsight;
    }
  }

  if (!insight.shouldPersist) return null;

  const universitiesValue = insight.universities.length ? insight.universities : null;
  const dedupHash = insight.questionHash ?? (universitiesValue ? buildUniversitiesHash(universitiesValue) : null);

  try {
    if (dedupHash) {
      const existingInsight = await db.query.aiChatbotMessageInsights.findFirst({
        where: eq(aiChatbotMessageInsights.questionHash, dedupHash),
      });

      if (existingInsight) {
        const [record] = await db
          .update(aiChatbotMessageInsights)
          .set({
            frequency: sql<number>`${aiChatbotMessageInsights.frequency} + 1`,
            questionText: insight.questionText ?? existingInsight.questionText,
            universities: universitiesValue ?? existingInsight.universities,
            isQuestion: insight.isQuestion,
            intent: insight.intent,
            source: existingInsight.source === 'llm' ? existingInsight.source : insight.source,
          })
          .where(eq(aiChatbotMessageInsights.id, existingInsight.id))
          .returning();

        return record;
      }
    }

    const [record] = await db
      .insert(aiChatbotMessageInsights)
      .values({
        messageId: args.messageId,
        chatSessionId: args.chatSessionId,
        userId: args.userId ?? null,
        intent: insight.intent,
        questionText: insight.questionText,
        questionHash: dedupHash,
        isQuestion: insight.isQuestion,
        universities: universitiesValue,
        source: insight.source,
        frequency: 1,
      })
      .returning();

    return record;
  } catch (error) {
    console.error('[chatbot-insights] Failed to record chat insight', error);
    return null;
  }
}
