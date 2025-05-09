<img src=".screenshots/logo.png" alt="Conversation Interface" width="800"/>


# AI DocuPartner

AI DocuPartner is a document management system with AI-powered conversation capabilities. It allows you to upload, organize, and query documents using large language models (LLMs) like OpenAI, future models supported in the future.

## Features

- **Document Management**: Upload, organize, and delete documents
- **Document Groups**: Organize documents into custom groups
- **Conversations**: Chat with AI about your documents
- **Web Search**: Enhance AI responses with web search capabilities
- **Multiple LLM Support**: Use OpenAI as your AI provider, future models supported in the future
- **Customizable Settings**: Configure your API keys and system prompts

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI Integration**: LangChain, OpenAI API, Anthropic API
- **File Storage**: Local file system

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.


## Project Structure

- `/app`: Next.js app directory with pages and API routes
- `/components`: Reusable React components
- `/files`: Local storage for uploaded files and conversation data
- `/public`: Static assets

## API Routes

- `/api/conversation`: Manage conversations
- `/api/document-groups`: Manage document groups
- `/api/files`: List and delete files
- `/api/upload`: Upload files
- `/api/rag`: RAG (Retrieval Augmented Generation) endpoints
- `/api/web-search`: Web search integration

## Screenshots

Here are some screenshots of the application:

### Conversation Interface
<img src=".screenshots/Screenshot_20250426_203043.png" alt="Conversation Interface with Markdown" width="800"/>

### Code Syntax Highlighting
<img src=".screenshots/Screenshot_20250426_203108.png" alt="Code Syntax Highlighting" width="800"/>

### Document Management
<img src=".screenshots/Screenshot_20250426_203119.png" alt="Document Upload" width="800"/>

### Database Management
<img src=".screenshots/Screenshot_20250426_203201.png" alt="Document Groups" width="800"/>

### LLM Provider Settings
<img src=".screenshots/Screenshot_20250426_203217.png" alt="Document Management" width="800"/>

### Prompt Settings
<img src=".screenshots/Screenshot_20250426_203225.png" alt="Document Details" width="800"/>

### MCP Integration
<img src=".screenshots/Screenshot_20250426_203233.png" alt="Web Search Integration" width="800"/>

### Web Search Integration
<img src=".screenshots/Screenshot_20250426_203306.png" alt="Settings Page" width="800"/>

## License

MIT