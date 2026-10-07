import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { convert } from "html-to-text";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { z } from "zod";
import { retrievalService } from "./retrievalService.js";
import type { IngestDocumentInput } from "../types/knowledgeTypes.js";

const ingestionMetadataSchema = z.object({
  title: z.string().trim().min(1),
  category: z.string().trim().min(1),
  tags: z.array(z.string()).optional(),
  sourceUrl: z.string().url().optional(),
  author: z.string().optional(),
  version: z.string().optional(),
  documentId: z.string().uuid().optional()
});

export class IngestionService {
  async ingestFile(filePath: string, metadata: unknown): Promise<string> {
    const details = ingestionMetadataSchema.parse(metadata);
    const extension = path.extname(filePath).toLowerCase();
    const buffer = await readFile(filePath);
    let content: string;
    if (extension === ".txt" || extension === ".md" || extension === ".markdown") {
      content = buffer.toString("utf8");
    } else if (extension === ".pdf") {
      content = (await pdfParse(buffer)).text;
    } else if (extension === ".docx") {
      content = (await mammoth.extractRawText({ buffer })).value;
    } else if (extension === ".html" || extension === ".htm") {
      content = convert(buffer.toString("utf8"), { wordwrap: false });
    } else {
      throw new Error(`Unsupported document format: ${extension || "(no extension)"}`);
    }
    if (!content.trim()) throw new Error(`No text content extracted from ${filePath}`);
    const input: IngestDocumentInput = {
      title: details.title,
      category: details.category,
      content,
      ...(details.tags ? { tags: details.tags } : {}),
      ...(details.sourceUrl ? { sourceUrl: details.sourceUrl } : {}),
      ...(details.author ? { author: details.author } : {}),
      ...(details.version ? { version: details.version } : {}),
      ...(details.documentId ? { documentId: details.documentId } : {})
    };
    return retrievalService.ingest(input);
  }

  async ingestBulk(directory: string, metadataForFile: (filePath: string) => Promise<unknown>): Promise<string[]> {
    const paths = await this.collectFiles(directory);
    const ingested: string[] = [];
    for (const filePath of paths) {
      const metadata = await metadataForFile(filePath);
      ingested.push(await this.ingestFile(filePath, metadata));
    }
    return ingested;
  }

  private async collectFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const paths = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? this.collectFiles(fullPath) : [fullPath];
    }));
    return paths.flat().filter((filePath) => [".pdf", ".docx", ".txt", ".md", ".markdown", ".html", ".htm"].includes(path.extname(filePath).toLowerCase())).sort();
  }
}

export const ingestionService = new IngestionService();
