/**
 * Bhashini API Client for Indian Language Support
 * 
 * Services:
 * - ASR (Automatic Speech Recognition) - Speech to Text
 * - TTS (Text to Speech) - Text to Audio
 * - NMT (Neural Machine Translation) - Translation
 * 
 * Supported Languages (ISO 639 codes):
 * hi (Hindi), bn (Bengali), ta (Tamil), te (Telugu), mr (Marathi),
 * gu (Gujarati), kn (Kannada), ml (Malayalam), pa (Punjabi), or (Odia),
 * as (Assamese), ur (Urdu), en (English), and more
 */

const BHASHINI_CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline";

// Language codes mapping
export const INDIAN_LANGUAGES = {
  hi: "Hindi",
  bn: "Bengali", 
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  or: "Odia",
  as: "Assamese",
  ur: "Urdu",
  en: "English",
  sa: "Sanskrit",
  ne: "Nepali",
  sd: "Sindhi",
  ks: "Kashmiri",
  doi: "Dogri",
  mai: "Maithili",
  mni: "Manipuri",
  brx: "Bodo",
  sat: "Santali",
  gom: "Konkani",
} as const;

export type LanguageCode = keyof typeof INDIAN_LANGUAGES;

interface PipelineConfig {
  callbackUrl: string;
  authKey: string;
  authValue: string;
  asrServiceId?: string;
  ttsServiceId?: string;
  nmtServiceId?: string;
}


/**
 * Get pipeline configuration from Bhashini
 * This must be called first to get the inference endpoint and auth tokens
 */
export async function getPipelineConfig(
  tasks: ("asr" | "translation" | "tts")[],
  sourceLanguage: LanguageCode,
  targetLanguage?: LanguageCode
): Promise<PipelineConfig> {
  const userId = process.env.BHASHINI_USER_ID;
  const apiKey = process.env.BHASHINI_API_KEY;
  const pipelineId = process.env.BHASHINI_PIPELINE_ID ?? "64392f96daac500b55c543cd";

  if (!userId || !apiKey) {
    throw new Error("BHASHINI_USER_ID and BHASHINI_API_KEY must be set in environment variables");
  }

  const pipelineTasksConfig = tasks.map(task => {
    if (task === "asr") {
      return {
        taskType: "asr",
        config: {
          language: { sourceLanguage }
        }
      };
    } else if (task === "translation") {
      return {
        taskType: "translation", 
        config: {
          language: { 
            sourceLanguage, 
            targetLanguage: targetLanguage ?? "en" 
          }
        }
      };
    } else {
      return {
        taskType: "tts",
        config: {
          language: { sourceLanguage: targetLanguage ?? sourceLanguage }
        }
      };
    }
  });

  const response = await fetch(BHASHINI_CONFIG_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "userID": userId,
      "ulcaApiKey": apiKey,
    },
    body: JSON.stringify({
      pipelineTasks: pipelineTasksConfig,
      pipelineRequestConfig: {
        pipelineId: pipelineId
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Bhashini config error: ${error}`);
  }

  const data = await response.json();
  
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const endpoint = data.pipelineInferenceAPIEndPoint;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const responseConfig = data.pipelineResponseConfig;

  const config: PipelineConfig = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    callbackUrl: endpoint.callbackUrl,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    authKey: endpoint.inferenceApiKey.name,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    authValue: endpoint.inferenceApiKey.value,
  };

  // Extract service IDs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  responseConfig?.forEach((taskConfig: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (taskConfig.taskType === "asr") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      config.asrServiceId = taskConfig.config?.[0]?.serviceId;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    } else if (taskConfig.taskType === "translation") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      config.nmtServiceId = taskConfig.config?.[0]?.serviceId;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    } else if (taskConfig.taskType === "tts") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      config.ttsServiceId = taskConfig.config?.[0]?.serviceId;
    }
  });

  return config;
}

/**
 * Speech to Text (ASR) - Convert audio to text
 * @param audioBase64 - Base64 encoded audio content
 * @param language - Source language code
 * @returns Transcribed text
 */
export async function speechToText(
  audioBase64: string,
  language: LanguageCode
): Promise<string> {
  const config = await getPipelineConfig(["asr"], language);

  const response = await fetch(config.callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [config.authKey]: config.authValue,
    },
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType: "asr",
          config: {
            language: { sourceLanguage: language },
            serviceId: config.asrServiceId,
            audioFormat: "wav",
            samplingRate: 16000,
          },
        },
      ],
      inputData: {
        audio: [{ audioContent: audioBase64 }],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ASR error: ${error}`);
  }

  const data = await response.json() as { pipelineResponse?: Array<{ output?: Array<{ source?: string }> }> };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
  return data.pipelineResponse?.[0]?.output?.[0]?.source ?? "";
}

/**
 * Text to Speech (TTS) - Convert text to audio
 * @param text - Text to convert to speech
 * @param language - Language code
 * @param gender - Voice gender (male/female)
 * @returns Base64 encoded audio
 */
export async function textToSpeech(
  text: string,
  language: LanguageCode,
  gender: "male" | "female" = "female"
): Promise<string> {
  const config = await getPipelineConfig(["tts"], language);

  const response = await fetch(config.callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [config.authKey]: config.authValue,
    },
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType: "tts",
          config: {
            language: { sourceLanguage: language },
            serviceId: config.ttsServiceId,
            gender: gender,
          },
        },
      ],
      inputData: {
        input: [{ source: text }],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS error: ${error}`);
  }

  const data = await response.json() as { pipelineResponse?: Array<{ audio?: Array<{ audioContent?: string }> }> };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
  return data.pipelineResponse?.[0]?.audio?.[0]?.audioContent ?? "";
}

/**
 * Translate text between Indian languages
 * @param text - Text to translate
 * @param sourceLanguage - Source language code
 * @param targetLanguage - Target language code
 * @returns Translated text
 */
export async function translateText(
  text: string,
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode
): Promise<string> {
  const config = await getPipelineConfig(["translation"], sourceLanguage, targetLanguage);

  const response = await fetch(config.callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [config.authKey]: config.authValue,
    },
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType: "translation",
          config: {
            language: { 
              sourceLanguage, 
              targetLanguage 
            },
            serviceId: config.nmtServiceId,
          },
        },
      ],
      inputData: {
        input: [{ source: text }],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Translation error: ${error}`);
  }

  const data = await response.json() as { pipelineResponse?: Array<{ output?: Array<{ target?: string }> }> };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
  return data.pipelineResponse?.[0]?.output?.[0]?.target ?? "";
}

/**
 * Full pipeline: Speech to Text + Translation + Text to Speech
 * Speak in one language, get audio output in another
 */
export async function speechToSpeechTranslation(
  audioBase64: string,
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode,
  gender: "male" | "female" = "female"
): Promise<{ transcription: string; translation: string; audioBase64: string }> {
  const config = await getPipelineConfig(
    ["asr", "translation", "tts"], 
    sourceLanguage, 
    targetLanguage
  );

  const response = await fetch(config.callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [config.authKey]: config.authValue,
    },
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType: "asr",
          config: {
            language: { sourceLanguage },
            serviceId: config.asrServiceId,
            audioFormat: "wav",
            samplingRate: 16000,
          },
        },
        {
          taskType: "translation",
          config: {
            language: { sourceLanguage, targetLanguage },
            serviceId: config.nmtServiceId,
          },
        },
        {
          taskType: "tts",
          config: {
            language: { sourceLanguage: targetLanguage },
            serviceId: config.ttsServiceId,
            gender,
          },
        },
      ],
      inputData: {
        audio: [{ audioContent: audioBase64 }],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Speech-to-speech error: ${error}`);
  }

  const data = await response.json() as { 
    pipelineResponse?: Array<{ 
      output?: Array<{ source?: string; target?: string }>; 
      audio?: Array<{ audioContent?: string }> 
    }> 
  };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const pipelineResponse = data.pipelineResponse ?? [];

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    transcription: pipelineResponse[0]?.output?.[0]?.source ?? "",
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    translation: pipelineResponse[1]?.output?.[0]?.target ?? "",
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    audioBase64: pipelineResponse[2]?.audio?.[0]?.audioContent ?? "",
  };
}
