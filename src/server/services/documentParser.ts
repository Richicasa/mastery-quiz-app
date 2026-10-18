import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function parseDocumentBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const lowerName = fileName.toLowerCase();

  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const data = await pdfParse(buffer);
    return data.text || '';
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  if (mimeType.startsWith('text/') || lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
    return buffer.toString('utf-8');
  }

  // Fallback to utf-8 text representation
  return buffer.toString('utf-8');
}

export function cleanAndSegmentParagraphs(rawText: string): string[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  // Normalize line endings
  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Split by multiple line breaks (paragraphs)
  const rawParagraphs = normalized.split(/\n\s*\n+/);

  const cleanedParagraphs: string[] = [];

  for (const block of rawParagraphs) {
    // Replace single line breaks inside a paragraph with a single space
    const cleaned = block
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Filter out meaningless artifacts (< 15 chars)
    if (cleaned.length < 15) {
      continue;
    }

    // If a paragraph is gigantic (> 2000 chars), split into sentence chunks so each paragraph can be exhausted without context loss
    if (cleaned.length > 2000) {
      const sentences = cleaned.match(/[^.!?]+[.!?]+(\s|$)/g) || [cleaned];
      let currentChunk = '';

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > 1500) {
          if (currentChunk.trim().length > 0) {
            cleanedParagraphs.push(currentChunk.trim());
          }
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
      if (currentChunk.trim().length > 0) {
        cleanedParagraphs.push(currentChunk.trim());
      }
    } else {
      cleanedParagraphs.push(cleaned);
    }
  }

  return cleanedParagraphs;
}
