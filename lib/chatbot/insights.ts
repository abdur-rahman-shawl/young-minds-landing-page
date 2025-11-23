import crypto from 'crypto';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

import { db } from '@/lib/db';
import { aiChatbotMessageInsights } from '@/lib/db/schema';

const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

const QUESTION_KEYWORDS = ['who', 'what', 'where', 'when', 'why', 'how', 'which', 'can', 'should', 'do', 'does', 'is', 'are', 'will', 'could'];
const UNIVERSITY_SUFFIXES = ['university', 'college', 'institute', 'school'];
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

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const computeHash = (value: string) => crypto.createHash('sha1').update(value).digest('hex');

const splitSentences = (raw: string): string[] => {
  return raw
    .split(/(?<=[.?!])\s+|[\n\r]+/g)
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean);
};

const detectQuestion = (raw: string): { isQuestion: boolean; normalizedQuestion: string | null } => {
  const sentences = splitSentences(raw);
  if (!sentences.length) return { isQuestion: false, normalizedQuestion: null };

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const startsWithQuestionWord = QUESTION_KEYWORDS.some((word) => lower.startsWith(`${word} `) || lower.startsWith(`${word}?`));
    const hasQuestionMark = sentence.includes('?');

    if (startsWithQuestionWord || hasQuestionMark) {
      const normalized = sentence.endsWith('?') ? sentence : `${sentence}?`;
      return { isQuestion: true, normalizedQuestion: normalized };
    }
  }

  return { isQuestion: false, normalizedQuestion: null };
};

const normalizeUniversityName = (value: string) => {
  const STOP_WORDS = ['is', 'are', 'was', 'were', 'tell', 'me', 'about', 'that', 'if', 'whether'];
  const words = value.split(' ').filter(Boolean);
  while (words.length && STOP_WORDS.includes(words[0].toLowerCase())) {
    words.shift();
  }
  const cleaned = words.join(' ').trim();
  if (!cleaned) return value.trim();
  return cleaned.replace(/\b(university|college|institute|school)\b/gi, (match) => match[0].toUpperCase() + match.slice(1).toLowerCase());
};

const detectUniversities = (raw: string): string[] => {
  const matches = new Set<string>();
  const pattern = /(?:university|college|institute|school)\s+(?:of\s+)?[A-Za-z&.\s]+|[A-Z][A-Za-z&.\s]+(?:University|College|Institute|School)/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(raw)) !== null) {
    const normalized = normalizeWhitespace(match[0]);
    if (!normalized) continue;
    const lower = normalized.toLowerCase();
    // Ensure it includes at least one of the suffix keywords to reduce false positives.
    if (UNIVERSITY_SUFFIXES.some((suffix) => lower.includes(suffix))) {
      matches.add(normalized);
    }
  }

  return Array.from(matches)
    .slice(0, 5)
    .map((name) => normalizeUniversityName(name));
};

export const extractChatInsight = (content: string): ExtractedInsight => {
  const { isQuestion, normalizedQuestion } = detectQuestion(content);
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
    questionText: normalizedQuestion,
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
    const normalizedQuestion = payload.normalizedQuestion ? normalizeWhitespace(payload.normalizedQuestion) : null;
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
      questionText: normalizedQuestion,
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

  try {
    const [record] = await db
      .insert(aiChatbotMessageInsights)
      .values({
        messageId: args.messageId,
        chatSessionId: args.chatSessionId,
        userId: args.userId ?? null,
        intent: insight.intent,
        questionText: insight.questionText,
        questionHash: insight.questionHash,
        isQuestion: insight.isQuestion,
        universities: insight.universities.length ? insight.universities : null,
        source: insight.source,
      })
      .returning();

    return record;
  } catch (error) {
    console.error('[chatbot-insights] Failed to record chat insight', error);
    return null;
  }
}
