import { htmlToPlainText } from '../../shared/models/card';

export async function copyCardContentToClipboard(content: string): Promise<void> {
  const plainText = htmlToPlainText(content);
  if (plainText === '') return;

  try {
    await navigator.clipboard.writeText(plainText);
  } catch {
    // Ignore clipboard failures for now.
  }
}
