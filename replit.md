# Overview

This is an AI-powered website builder application that generates complete web projects based on natural language descriptions. The system uses a React frontend with WebContainer technology to provide an in-browser development environment, and an Express backend that interfaces with AI language models to generate project templates and code.

The application follows a step-based workflow where users describe their desired website, the AI determines the appropriate template (Node.js or React), generates the project structure, and displays the build process with live code preview capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## October 15, 2025 - UX Enhancements and Feature Additions
- **Download Project Feature**: Added ZIP export functionality allowing users to download entire project with all files and folder structure
- **Auto-Open Files**: Files now automatically open in the code editor when AI creates or edits them, improving workflow visibility
- **Streaming Responses**: Implemented real-time streaming for AI chat responses using Server-Sent Events (SSE) for better user experience
- **Enhanced UI**: Upgraded message box and send button with modern gradient design, hover effects, and keyboard shortcuts
- **App Rebranding**: Changed application name from "Website Builder AI" to "InfonexAgent"

## October 15, 2025 - Replit Setup and OpenRouter Migration
- **Migrated from Anthropic to OpenRouter**: Replaced Anthropic Claude API with OpenRouter's AI service (z-ai/glm-4.5-air:free model)
- **Configured Replit proxy**: Updated Vite config to bind to 0.0.0.0:5000 and added proxy for /api routes
- **Backend URL update**: Changed frontend to use relative `/api` path for backend communication
- **Workflow setup**: Created start.sh script to run backend and frontend concurrently
- **Deployment configuration**: Set up VM deployment with build step for frontend and concurrent backend/frontend serving

# System Architecture

## Frontend Architecture

**Framework**: React 18 with TypeScript, built using Vite as the build tool and dev server.

**Key Design Decisions**:
- **Client-side code execution**: Uses WebContainer API to run a full Node.js environment directly in the browser, enabling real-time preview of generated websites without server-side infrastructure.
- **Routing**: React Router v6 for navigation between home page (prompt input) and builder page (project generation interface).
- **State management**: Local component state using React hooks - no global state library chosen, keeping the architecture simple.
- **UI styling**: TailwindCSS for utility-first styling with custom configuration.
- **Code editing**: Monaco Editor (VS Code's editor) for syntax-highlighted, read-only code viewing.

**Component Structure**:
- **Pages**: Home (prompt input), Builder (main IDE-like interface)
- **Components**: StepsList (build progress), FileExplorer (project tree), CodeEditor (file viewer), PreviewFrame (live preview), TabView (code/preview switcher)

**Cross-Origin Requirements**: The Vite server is configured with specific CORS headers (`Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy`) required for WebContainer's SharedArrayBuffer usage.

## Backend Architecture

**Framework**: Express.js with TypeScript, using CommonJS module system.

**Key Design Decisions**:
- **Stateless API**: The backend serves as a thin proxy layer to the OpenRouter API, determining project templates based on user prompts.
- **Template selection**: Uses a lightweight AI model (glm-4.5-air) specifically for classifying whether a project should be Node.js or React-based.
- **Prompt engineering**: Contains base prompts and system prompts that guide the AI in generating code with specific formatting (XML-based artifact structure with `boltArtifact` and `boltAction` tags).
- **CORS enabled**: Allows cross-origin requests from the frontend.

**API Endpoints**:
- `POST /template`: Accepts user prompt, queries AI for template type, returns appropriate base prompts and UI scaffolding.
- `POST /chat`: Streaming endpoint that uses Server-Sent Events (SSE) to stream AI responses in real-time for better UX.

**Constraints handling**: The system prompt includes detailed WebContainer limitations (no pip, no native binaries, no git, limited shell support) to guide the AI in generating compatible code.

## Data Flow Architecture

1. User submits natural language prompt on Home page
2. Frontend navigates to Builder page and calls `/api/template` endpoint
3. Backend queries OpenRouter AI to classify project type (Node vs React)
4. Backend returns structured prompts including base template XML
5. Frontend parses XML responses into Step objects using custom XML parser
6. Steps are executed sequentially, creating files in WebContainer virtual filesystem
7. WebContainer boots npm dev server and exposes preview URL
8. Preview renders in iframe within the Builder interface

**XML-based Protocol**: The system uses a custom XML format (`boltArtifact`, `boltAction`) for structured code generation, allowing the parser to extract file operations (create, edit, delete) and shell commands from AI responses.

## Code Generation Architecture

**Step Types**:
- CreateFile: Generate new file with content
- CreateFolder: Create directory structure
- EditFile: Modify existing file
- DeleteFile: Remove file
- RunScript: Execute shell commands in WebContainer

**File Structure Building**: The frontend maintains a tree structure of FileItem objects, dynamically building the project hierarchy as steps are processed.

# External Dependencies

## Third-party APIs

**OpenRouter AI API**: Primary AI service for code generation and template classification.
- Used for: Determining project type (Node vs React) and generating full project code
- Authentication: API key stored in backend environment variables (OPENROUTER_API_KEY)
- Model: z-ai/glm-4.5-air:free (free model for both template selection and chat/code generation)
- Endpoint: https://openrouter.ai/api/v1/chat/completions

## Browser APIs

**WebContainer API** (@webcontainer/api): Browser-based Node.js runtime.
- Purpose: Enables running npm, Node.js, and development servers entirely in the browser
- Constraints: No native binaries, limited Python stdlib only, no pip, no C++ compiler
- Key features: Virtual filesystem, process spawning, network server support
- Requirements: Specific CORS headers for SharedArrayBuffer support

## NPM Packages

**Frontend**:
- `react` & `react-dom`: UI framework
- `react-router-dom`: Client-side routing
- `@monaco-editor/react`: Code editor component (VS Code editor)
- `axios`: HTTP client for API requests
- `lucide-react`: Icon library
- `xml2js`: XML parsing utilities
- `tailwindcss`: Utility-first CSS framework
- `vite`: Build tool and dev server

**Backend**:
- `express`: Web server framework
- `cors`: CORS middleware
- `dotenv`: Environment variable management
- `typescript`: Type system

## Development Tools

- **TypeScript**: Static typing across both frontend and backend
- **ESLint**: Code linting with React-specific rules
- **PostCSS**: CSS processing for Tailwind
- **Autoprefixer**: CSS vendor prefixing

## Proxy Configuration

The Vite dev server is configured to:
- Bind to `0.0.0.0:5000` to work with Replit's proxy/iframe architecture
- Proxy `/api/*` requests to `http://localhost:3000` (backend), enabling seamless frontend-backend communication during development while avoiding CORS issues
- Frontend makes all API calls to `/api` which are transparently proxied to the backend