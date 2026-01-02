import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    OPENAI_API_KEY: z.string(),
    TOGETHER_AI_API_KEY: z.string(),
    TAVILY_API_KEY: z.string().optional(),
    GOOGLE_API_KEY: z.string().optional(),
    GOOGLE_AI_PRO_KEY: z.string().optional(),
    NANO_BANANA_API_KEY: z.string().optional(),
    NANO_BANANA_API_URL: z.string().url().optional(),
    YOUTUBE_API_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    // Bhashini API for Indian language support (ASR, TTS, Translation)
    BHASHINI_USER_ID: z.string().optional(),
    BHASHINI_API_KEY: z.string().optional(),
    BHASHINI_PIPELINE_ID: z.string().optional(),

    NEXTAUTH_URL: z.preprocess(
      (str) => process.env.VERCEL_URL ?? str ?? 'http://localhost:3000',
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      process.env.VERCEL || process.env.ELECTRON ? z.string() : z.string().url()
    ),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TOGETHER_AI_API_KEY: process.env.TOGETHER_AI_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GOOGLE_AI_PRO_KEY: process.env.GOOGLE_AI_PRO_KEY,
    NANO_BANANA_API_KEY: process.env.NANO_BANANA_API_KEY,
    NANO_BANANA_API_URL: process.env.NANO_BANANA_API_URL,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    BHASHINI_USER_ID: process.env.BHASHINI_USER_ID,
    BHASHINI_API_KEY: process.env.BHASHINI_API_KEY,
    BHASHINI_PIPELINE_ID: process.env.BHASHINI_PIPELINE_ID,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
