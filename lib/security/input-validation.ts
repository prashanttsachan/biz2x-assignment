const MAX_CHAT_QUESTION_LENGTH = 2000;
const MAX_UPLOAD_FILENAME_LENGTH = 255;

export function validateChatQuestion(question: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = question.trim();
  if (!trimmed) {
    return { valid: false, error: "Question cannot be empty." };
  }
  if (trimmed.length > MAX_CHAT_QUESTION_LENGTH) {
    return {
      valid: false,
      error: `Question exceeds ${MAX_CHAT_QUESTION_LENGTH} characters.`,
    };
  }
  return { valid: true };
}

export function sanitizeFileName(fileName: string): string {
  const base = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, MAX_UPLOAD_FILENAME_LENGTH);
  if (!base || /^[._-]+$/.test(base)) return "upload.bin";
  return base;
}
