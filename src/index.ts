import { readFileSync, writeFileSync } from "node:fs";
import type {
  ChunkContext,
  ReWriteFileSyncOptions,
  UpdateResult,
} from "./types";
import { bgWhiteBright, grayBold, whiteBold } from "./logger";
import pc from "picocolors";
import { isObjectLiteral, replaceAll, formatSeparator } from "./utils";

// todo: path input should also accept an array of paths
export function reWriteFileSync(
  path: string,
  options: ReWriteFileSyncOptions
): void {
  // options
  const encoding: BufferEncoding = options.encoding || "utf8";
  const separator: string = options.separator || "\n";
  const removeEmpty = options.removeEmpty || false;
  const debugOutputLimit = options.debugOutputLimit || 10;
  const shouldPrintChunks = options.debug;
  const shouldBailOnFirstMatch =
    ("bailOnFirstMatch" in options && options.bailOnFirstMatch === true) ||
    false;
  const shouldInvertChunks = options.invert || false;

  const shouldPreserveInvertedOrder = options.preserveInvertedOrder || false;

  const fileContent = readFileSync(path, { encoding });
  const chunks = shouldInvertChunks
    ? fileContent.split(separator).reverse()
    : fileContent.split(separator);

  // DEBUG MODE
  // Debug output limit: clamp/truncate debug-mode output to prevent overwhelming the terminal UI
  // Default limit is 10 chunks, but users can specify a custom number value
  if (shouldPrintChunks) {
    const chunks = getChunks(fileContent, separator);
    console.log(
      bgWhiteBright(pc.blackBright("------ RWFS: DEBUG MODE ------"))
    );
    console.log(
      pc.gray("Chunks Size: "),
      pc.bold(pc.whiteBright(chunks.length))
    );
    // Show separator as a visible escape sequence if it's a control character
    const visibleSeparator = formatSeparator(separator);
    console.log(
      pc.gray("Separator: "),
      pc.bold(`${pc.redBright(visibleSeparator)}`)
    );

    const totalChunks = chunks.length;
    // Determine selection strategy: numeric limit or range
    let startIndex = 0;
    let endIndex = totalChunks - 1; // inclusive
    if (
      isObjectLiteral(debugOutputLimit) &&
      "start" in debugOutputLimit &&
      "end" in debugOutputLimit
    ) {
      // handle out-of-bounds value; `value < 0`(negative)
      startIndex = Math.max(
        0,
        // handle out-of-bounds; `value > 0`(positive)
        Math.min(totalChunks - 1, debugOutputLimit.start - 1)
      );
      endIndex = Math.max(
        0,
        Math.min(totalChunks - 1, debugOutputLimit.end - 1)
      );
    } else if (typeof debugOutputLimit === "number") {
      endIndex = Math.min(totalChunks - 1, Math.max(0, debugOutputLimit - 1));
      startIndex = 0;
    }

    if (endIndex < startIndex) {
      // swap if provided in reverse
      const tmp = startIndex;
      startIndex = endIndex;
      endIndex = tmp;
    }

    const visibleCount = endIndex - startIndex + 1;
    const chunksToShow = chunks.slice(startIndex, endIndex + 1);
    const isNumericLimit = typeof debugOutputLimit === "number";
    const shouldDisplayAllChunks =
      startIndex === 0 && endIndex === totalChunks - 1;
    const shouldClamp = isNumericLimit
      ? totalChunks > (debugOutputLimit as number)
      : // clamp for every use case except when they explicity want to view everything
        !shouldDisplayAllChunks;

    if (isNumericLimit && shouldClamp) {
      console.log(
        pc.yellow(
          `⚠️  Output limited to first ${debugOutputLimit as number} chunks (${
            totalChunks - (debugOutputLimit as number)
          } more chunks not shown)`
        )
      );
    } else {
      console.log(
        pc.yellow(
          `📍 Showing chunks ${startIndex + 1}-${
            endIndex + 1
          } of ${totalChunks} (${visibleCount} shown)`
        )
      );
    }

    chunksToShow.forEach((chunk, index) => {
      const absoluteIndex = startIndex + index; // zero-based absolute index
      const chunkNumber = absoluteIndex + 1; // human-friendly 1-based
      const header = `--- Chunk ${chunkNumber} ---`;
      const footer = `--- End Chunk ${chunkNumber} ---`;
      console.log(
        "\n" +
          whiteBold(header) +
          "\n\n" +
          replaceAll(JSON.stringify(chunk), {
            "\\n": pc.greenBright("\\n"),
            "\\r": pc.greenBright("\\r"),
            [visibleSeparator]: pc.redBright(visibleSeparator),
          }) +
          "\n\n" +
          grayBold(footer) +
          "\n\n"
      );
    });

    if (isNumericLimit) {
      if (shouldClamp) {
        console.log(
          pc.yellow(
            `... and ${totalChunks - (debugOutputLimit as number)} more chunks`
          )
        );
      }
    }
  }

  // create context for each chunk
  const createContext = (idx: number): ChunkContext => ({
    chunk: chunks[idx] as string,
    index: idx,
    prevChunk: idx > 0 ? chunks[idx - 1] : undefined,
    nextChunk: idx < chunks.length - 1 ? chunks[idx + 1] : undefined,
  });

  let updatedChunks: UpdateResult[];

  if ("updates" in options && Array.isArray(options.updates)) {
    // Overload with multiple update functions.
    updatedChunks = chunks.map((_, idx) => {
      const context = createContext(idx);
      let newChunk: UpdateResult = context.chunk;
      for (const { constraint, update } of options.updates) {
        if (
          typeof constraint === "function" &&
          constraint(context, separator)
        ) {
          newChunk = update(context, separator);
        }
      }
      return newChunk;
    });
  } else if ("constraint" in options && "update" in options) {
    // Overload with a single constraint/update pair.
    let bailed = false;
    updatedChunks = chunks.map((_, idx) => {
      const context = createContext(idx);
      if (bailed) return context.chunk;
      if (options.constraint(context, separator)) {
        bailed = shouldBailOnFirstMatch && true;
        return options.update(context, separator);
      }
      return context.chunk;
    });
  } else {
    // no valid update option provided: leave content unchanged.
    updatedChunks = chunks;
  }

  let finalChunks = (
    removeEmpty
      ? updatedChunks.filter((chunk) => Boolean(chunk))
      : updatedChunks
  ).filter((chunk) => typeof chunk !== "object");

  // If chunks were inverted for processing but we don't want to preserve the inverted order,
  // reverse them back to original order before writing
  if (shouldInvertChunks && !shouldPreserveInvertedOrder) {
    finalChunks = finalChunks.reverse();
  }

  writeFileSync(path, finalChunks.join(separator), encoding);
  // rwfs is matching more than one chunk for the rewrite
  // because `getChunks` preserves the separator within the chunk, replacing the content gets rid of the separator as well
  // since the separator is already passed to the `constraint` and `update` callback(s), we can decide to split using `String.split()`
  // the separator is never lost
  //? unlike String.split(separator), `getChunks` preserves the separator within the chunks hence the reason why we join with empty-string("")
  // writeFileSync(path, finalChunks.join(""), encoding);
}

// todo: test this function
export function getChunks(content: string, sep: string, normalize?: boolean) {
  const token = "lofo--";
  const normalizedContent = normalize
    ? content.replaceAll("\n", "LF")
    : content;
  return normalizedContent.replaceAll(sep, token + sep).split(token);
}

export { reWriteFileSync as rwfs };
