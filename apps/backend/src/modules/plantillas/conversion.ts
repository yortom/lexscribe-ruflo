/**
 * Conversion helpers for plantilla formats (DATOS §4.3, locked decisions D-08/D-09).
 *
 * docxToTexto: .docx buffer → plain text (mammoth raw extraction, keeps {{...}} markers verbatim).
 * textoToDocxBuffer: plain text → .docx buffer (docx npm, one Paragraph per line).
 *
 * NO docxtemplater — that is Phase 6 (document generation, not template storage).
 */
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';

/**
 * Extract plain text from a .docx buffer.
 * Uses mammoth's raw text extraction which preserves {{...}} markers verbatim
 * (no HTML conversion — avoids escaping of variable syntax).
 */
export async function docxToTexto(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Convert plain text to a .docx Buffer.
 * Splits on \n, creates one Paragraph per line.
 * Basic paragraphs only — no styling (Phase 6 will handle rich output via docxtemplater).
 */
export async function textoToDocxBuffer(texto: string): Promise<Buffer> {
  const lines = texto.split('\n');

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: lines.map(
          (line) =>
            new Paragraph({
              children: [new TextRun(line)],
            }),
        ),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
