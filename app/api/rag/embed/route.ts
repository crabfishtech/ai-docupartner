import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Chroma } from "langchain/vectorstores/chroma";

// POST /api/rag/embed?conversation=GUID
export async function POST(req: NextRequest) {
  const conversation = req.nextUrl.searchParams.get("conversation");
  if (!conversation) return NextResponse.json({ error: "Missing conversation GUID" }, { status: 400 });
  const filesDir = path.join(process.cwd(), "files", conversation);
  if (!existsSync(filesDir)) return NextResponse.json({ error: "No files for conversation" }, { status: 404 });

  // Read all text files in the conversation folder
  const files = (await import("fs/promises")).readdir(filesDir);
  const docs: { content: string; name: string }[] = [];
  for (const file of await files) {
    const ext = path.extname(file).toLowerCase();
    if ([".txt", ".md"].includes(ext)) {
      const content = readFileSync(path.join(filesDir, file), "utf8");
      docs.push({ content, name: file });
    }
    // TODO: Add PDF/DOCX parsing as needed
  }

  // Split and embed
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 100 });
  const allChunks = [];
  for (const doc of docs) {
    const splits = await splitter.splitText(doc.content);
    for (const chunk of splits) {
      allChunks.push({ content: chunk, metadata: { file: doc.name } });
    }
  }

  // Embed and store in Chroma
  const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
  const vectorStore = await Chroma.fromTexts(
    allChunks.map(c => c.content),
    allChunks.map(c => c.metadata),
    embeddings,
    { collectionName: `conv_${conversation}` }
  );

  return NextResponse.json({ embedded: allChunks.length });
}
