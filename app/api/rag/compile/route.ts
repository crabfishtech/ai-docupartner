import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { existsSync, readdirSync, readFileSync } from "fs";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "langchain/document";

// Import document loaders
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import sharp from "sharp";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { readFile } from "fs/promises";

// Function to read settings
function readSettings() {
  const settingsPath = path.join(process.cwd(), "files", "app-settings.json");
  
  if (!existsSync(settingsPath)) {
    return {
      llm_provider: "openai",
      llm_model: "gpt-4o",
      system_prompt: "You are a helpful assistant.",
      llm_api_key: process.env.OPENAI_API_KEY,
      vector_store: "memory"
    };
  }
  
  try {
    const fileContent = fs.readFileSync(settingsPath, "utf8");
    const settings = JSON.parse(fileContent);
    
    // Use environment variables as fallbacks
    if (!settings.llm_api_key) {
      if (settings.llm_provider === "openai") {
        settings.llm_api_key = process.env.OPENAI_API_KEY;
      } else if (settings.llm_provider === "anthropic") {
        settings.llm_api_key = process.env.ANTHROPIC_API_KEY;
      }
    }
    
    return settings;
  } catch (error) {
    console.error("Error reading settings file:", error);
    return {
      llm_provider: "openai",
      llm_model: "gpt-4o",
      system_prompt: "You are a helpful assistant.",
      llm_api_key: process.env.OPENAI_API_KEY,
      vector_store: "memory"
    };
  }
}

// POST /api/rag/compile - Compile all documents into the vector database
export async function POST() {
  try {
    const settings = readSettings();
    const vectorStoreType = settings.vector_store || "memory";
    const apiKey = settings.llm_api_key;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required for embedding" },
        { status: 400 }
      );
    }
    
    // Initialize embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: "text-embedding-3-small",
    });
    
    // Base directory for files
    const filesBaseDir = path.join(process.cwd(), "files");
    const groupsDir = path.join(filesBaseDir, "groups");
    
    // Ensure the groups directory exists
    if (!existsSync(groupsDir)) {
      return NextResponse.json({ success: true, message: "No documents to compile" });
    }
    
    // Get all document groups
    const groups = readdirSync(groupsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    if (groups.length === 0) {
      return NextResponse.json({ success: true, message: "No documents to compile" });
    }
    
    // Initialize text splitter
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    // Process all documents
    const allDocuments: Document[] = [];
    
    for (const group of groups) {
      const groupPath = path.join(groupsDir, group);
      const files = readdirSync(groupPath, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .filter(dirent => !dirent.name.endsWith('.json')); // Exclude JSON files
      
      for (const file of files) {
        const filePath = path.join(groupPath, file.name);
        const fileExt = path.extname(file.name).toLowerCase();
        
        try {
          // Process different file types using appropriate loaders
          let docs: Document[] = [];
          
          switch (fileExt.toLowerCase()) {
            case ".txt":
            case ".md":
              // Plain text files
              const textContent = readFileSync(filePath, 'utf-8');
              const textChunks = await textSplitter.splitText(textContent);
              docs = textChunks.map(chunk => new Document({
                pageContent: chunk,
                metadata: {
                  source: file.name,
                  group: group,
                  path: filePath,
                  type: fileExt
                }
              }));
              break;
              
            case ".pdf":
              // PDF files
              try {
                const pdfLoader = new PDFLoader(filePath);
                const pdfDocs = await pdfLoader.load();
                // Further split the PDF documents if they're too large
                for (const doc of pdfDocs) {
                  const chunks = await textSplitter.splitText(doc.pageContent);
                  docs.push(...chunks.map(chunk => new Document({
                    pageContent: chunk,
                    metadata: {
                      ...doc.metadata,
                      source: file.name,
                      group: group,
                      path: filePath,
                      type: fileExt
                    }
                  })));
                }
              } catch (error) {
                const pdfError = error as Error;
                console.error(`Error processing PDF ${filePath}:`, pdfError);
                // Fallback for PDFs that can't be processed
                docs = [new Document({
                  pageContent: `PDF file content could not be extracted from ${file.name}. Error: ${pdfError.message || 'Unknown error'}`,
                  metadata: {
                    source: file.name,
                    group: group,
                    path: filePath,
                    type: fileExt
                  }
                })];
              }
              break;
              
            case ".docx":
            case ".doc":
              // Word documents
              try {
                const docxLoader = new DocxLoader(filePath);
                const wordDocs = await docxLoader.load();
                // Further split the Word documents if they're too large
                for (const doc of wordDocs) {
                  const chunks = await textSplitter.splitText(doc.pageContent);
                  docs.push(...chunks.map(chunk => new Document({
                    pageContent: chunk,
                    metadata: {
                      ...doc.metadata,
                      source: file.name,
                      group: group,
                      path: filePath,
                      type: fileExt
                    }
                  })));
                }
              } catch (error) {
                const docError = error as Error;
                console.error(`Error processing DOCX with DocxLoader ${filePath}:`, docError);
                // Fallback using mammoth for Word documents
                try {
                  const buffer = await readFile(filePath);
                  const result = await mammoth.extractRawText({ buffer });
                  const text = result.value;
                  const chunks = await textSplitter.splitText(text);
                  docs = chunks.map(chunk => new Document({
                    pageContent: chunk,
                    metadata: {
                      source: file.name,
                      group: group,
                      path: filePath,
                      type: fileExt
                    }
                  }));
                } catch (error) {
                  const mammothError = error as Error;
                  console.error(`Error processing Word document with mammoth ${filePath}:`, mammothError);
                  docs = [new Document({
                    pageContent: `Word document content could not be extracted from ${file.name}. Error: ${mammothError.message || 'Unknown error'}`,
                    metadata: {
                      source: file.name,
                      group: group,
                      path: filePath,
                      type: fileExt
                    }
                  })];
                }
              }
              break;
              
            case ".csv":
              // CSV files
              try {
                const csvLoader = new CSVLoader(filePath);
                const csvDocs = await csvLoader.load();
                docs = csvDocs.map(doc => {
                  return new Document({
                    pageContent: doc.pageContent,
                    metadata: {
                      ...doc.metadata,
                      source: file.name,
                      group: group,
                      path: filePath,
                      type: fileExt
                    }
                  });
                });
              } catch (error) {
                const csvError = error as Error;
                console.error(`Error processing CSV ${filePath}:`, csvError);
                docs = [new Document({
                  pageContent: `CSV file content could not be extracted from ${file.name}. Error: ${csvError.message || 'Unknown error'}`,
                  metadata: {
                    source: file.name,
                    group: group,
                    path: filePath,
                    type: fileExt
                  }
                })];
              }
              break;
              
            case ".xlsx":
            case ".xls":
              // Excel files
              try {
                const buffer = await readFile(filePath);
                const workbook = XLSX.read(buffer);
                let excelText = "";
                
                // Process each sheet
                for (const sheetName of workbook.SheetNames) {
                  const sheet = workbook.Sheets[sheetName];
                  const sheetData = XLSX.utils.sheet_to_json(sheet);
                  excelText += `Sheet: ${sheetName}\n${JSON.stringify(sheetData, null, 2)}\n\n`;
                }
                
                const chunks = await textSplitter.splitText(excelText);
                docs = chunks.map(chunk => new Document({
                  pageContent: chunk,
                  metadata: {
                    source: file.name,
                    group: group,
                    path: filePath,
                    type: fileExt,
                    sheetCount: workbook.SheetNames.length
                  }
                }));
              } catch (error) {
                const excelError = error as Error;
                console.error(`Error processing Excel file ${filePath}:`, excelError);
                docs = [new Document({
                  pageContent: `Excel file content could not be extracted from ${file.name}. Error: ${excelError.message || 'Unknown error'}`,
                  metadata: {
                    source: file.name,
                    group: group,
                    path: filePath,
                    type: fileExt
                  }
                })];
              }
              break;
              
            case ".png":
            case ".jpg":
            case ".jpeg":
            case ".webp":
              // Image files
              try {
                // For images, we'll extract metadata and dimensions
                const imageMetadata = await sharp(filePath).metadata();
                const imageInfo = `Image: ${file.name}\nType: ${imageMetadata.format}\nDimensions: ${imageMetadata.width}x${imageMetadata.height}\nSize: ${imageMetadata.size} bytes`;
                
                docs = [new Document({
                  pageContent: imageInfo,
                  metadata: {
                    source: file.name,
                    group: group,
                    path: filePath,
                    type: fileExt,
                    width: imageMetadata.width,
                    height: imageMetadata.height,
                    format: imageMetadata.format
                  }
                })];
              } catch (error) {
                const imageError = error as Error;
                console.error(`Error processing image ${filePath}:`, imageError);
                docs = [new Document({
                  pageContent: `Image metadata could not be extracted from ${file.name}. Error: ${imageError.message || 'Unknown error'}`,
                  metadata: {
                    source: file.name,
                    group: group,
                    path: filePath,
                    type: fileExt
                  }
                })];
              }
              break;
              
            default:
              // For other file types, use a generic approach
              docs = [new Document({
                pageContent: `File: ${file.name} (Content type ${fileExt} not directly supported)`,
                metadata: {
                  source: file.name,
                  group: group,
                  path: filePath,
                  type: fileExt
                }
              })];
          }
          
          // Add the processed documents to our collection
          allDocuments.push(...docs);
        } catch (error) {
          console.error(`Error processing file ${filePath}:`, error);
          // Continue with other files
        }
      }
    }
    
    if (allDocuments.length === 0) {
      return NextResponse.json({ success: true, message: "No documents were processed" });
    }
    
    // Store documents in vector store
    if (vectorStoreType === "chroma") {
      // Use Chroma vector store
      const chromaDir = path.join(filesBaseDir, "chroma");
      
      // Create a new Chroma collection
      await Chroma.fromDocuments(allDocuments, embeddings, {
        collectionName: "documents",
        url: settings.chroma_url || "http://localhost:8000", // Use URL from settings or default
        collectionMetadata: {
          "hnsw:space": "cosine",
        },
        // Note: The directory is handled by Chroma internally
        // We don't pass the path directly to avoid type errors
      });
    } else {
      // Use in-memory vector store
      const vectorStore = await MemoryVectorStore.fromDocuments(
        allDocuments,
        embeddings
      );
      
      // Get embeddings for all documents
      const documentEmbeddings = await Promise.all(
        allDocuments.map(async (doc) => {
          const embedding = await embeddings.embedQuery(doc.pageContent);
          return {
            content: doc.pageContent,
            metadata: doc.metadata,
            embedding: embedding
          };
        })
      );
      
      // Serialize the vector store to JSON in the format expected by the ask endpoint
      const vectorStoreData = {
        memoryVectors: documentEmbeddings
      };
      
      // Save to file in the global location
      const vectorStorePath = path.join(filesBaseDir, "vector-store.json");
      fs.writeFileSync(
        vectorStorePath,
        JSON.stringify(vectorStoreData, null, 2)
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Database compiled successfully",
      documentCount: allDocuments.length,
    });
  } catch (error) {
    console.error("Error compiling database:", error);
    return NextResponse.json(
      { error: "Failed to compile database" },
      { status: 500 }
    );
  }
}
