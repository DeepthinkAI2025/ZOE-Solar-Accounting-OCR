import type { Provider, ExtractedData } from '../types';
import { OCR_PROMPT } from '../config';
import { FreeAIServiceError } from '../errors';
import { fetchWithTimeout, handleAPIError } from './base';
import { parseOpenAICompatibleResponse } from '../parsers';

export async function tryNVIDIA(
  provider: Provider,
  base64: string,
  mimeType: string
): Promise<Partial<ExtractedData>> {
  const { config } = provider;

  const requestBody = {
    model: config.model,
    messages: [
      {
        role: 'user',
        content: `${OCR_PROMPT}\n\n<img src="data:${mimeType};base64,${base64}" />`,
      },
    ],
    max_tokens: 16384,
    temperature: 0.6,
    top_p: 0.95,
    top_k: 20,
    presence_penalty: 0,
    repetition_penalty: 1,
    stream: false,
    chat_template_kwargs: {
      enable_thinking: true,
    },
  };

  const response = await fetchWithTimeout(
    `${config.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    },
    config.timeout
  );

  if (!response.ok) {
    const errorBody = await response.text();
    handleAPIError(response, 'NVIDIA', errorBody);
  }

  const responseData = await response.json();
  return parseOpenAICompatibleResponse(responseData, 'NVIDIA');
}
