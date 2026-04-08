import { Injectable } from '@nestjs/common';

export interface ChunkResult {
  parentChunks: ParentChunk[];
}

export interface ParentChunk {
  content: string;
  chunkIndex: number;
  pageNumber?: number;
  tokenCount: number;
  children: ChildChunk[];
}

export interface ChildChunk {
  content: string;
  chunkIndex: number;
  pageNumber?: number;
  tokenCount: number;
}

interface ChunkerOptions {
  parentSize?: number;
  childSize?: number;
  overlap?: number;
}

const DEFAULT_PARENT_SIZE = 2000;
const DEFAULT_CHILD_SIZE = 500;
const DEFAULT_OVERLAP = 100;

@Injectable()
export class ChunkerService {
  /**
   * Split text into hierarchical parent-child chunks.
   * Parent chunks provide broader context; child chunks are used for embedding/retrieval.
   */
  chunk(text: string, options?: ChunkerOptions): ChunkResult {
    const parentSize = options?.parentSize ?? DEFAULT_PARENT_SIZE;
    const childSize = options?.childSize ?? DEFAULT_CHILD_SIZE;
    const overlap = options?.overlap ?? DEFAULT_OVERLAP;

    const parentChunks = this.splitIntoChunks(text, parentSize, overlap);

    let globalChildIndex = 0;
    const result: ParentChunk[] = parentChunks.map((parentText, pIdx) => {
      const childTexts = this.splitIntoChunks(parentText, childSize, overlap);
      const children: ChildChunk[] = childTexts.map((childText) => {
        const child: ChildChunk = {
          content: childText,
          chunkIndex: globalChildIndex++,
          tokenCount: this.estimateTokens(childText),
        };
        return child;
      });

      return {
        content: parentText,
        chunkIndex: pIdx,
        tokenCount: this.estimateTokens(parentText),
        children,
      };
    });

    return { parentChunks: result };
  }

  private splitIntoChunks(
    text: string,
    chunkSize: number,
    overlap: number,
  ): string[] {
    if (!text || text.length === 0) return [];
    if (text.length <= chunkSize) return [text];

    const chunks: string[] = [];
    const separators = ['\n\n', '\n', '. ', ', ', ' '];

    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      if (end < text.length) {
        let bestBreak = -1;
        for (const sep of separators) {
          const searchStart = Math.max(start + chunkSize * 0.6, start);
          const idx = text.lastIndexOf(sep, end);
          if (idx > searchStart) {
            bestBreak = idx + sep.length;
            break;
          }
        }
        if (bestBreak > start) {
          end = bestBreak;
        }
      }

      const chunk = text.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      start = Math.max(start + 1, end - overlap);
    }

    return chunks;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
