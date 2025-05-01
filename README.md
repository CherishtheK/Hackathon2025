# PDF Management & AI Summarization Web App

A full-stack web application for managing, converting, and summarizing PDF documents, designed for the MS Hackathon 2025.  
Features include project management, PDF upload to Azure Blob Storage, serverless conversion and AI-powered summarization, and interactive document exploration.

---

## Features

- **Project & Document Management**: Organize PDFs into projects, archive/restore, and delete.
- **PDF Upload & Conversion**: Upload PDFs directly to Azure Blob Storage; an Azure Function (Python) is automatically triggered to convert the PDF to structured JSON, which is also stored in Azure Blob.
- **AI Summarization**: Generate detailed, paragraph-style summaries with block-level citations using GPT-4 (Azure OpenAI).
- **Interactive UI**: Sidebar navigation, document details, summary-to-original highlighting, and chat interface.
- **IndexedDB Caching**: Fast, offline-friendly access to previously processed documents.

---

## Architecture & Workflow

1. **PDF Upload**: User uploads a PDF via the web app. The file is uploaded directly to Azure Blob Storage using a SAS URL.
2. **Event Trigger**: The upload triggers an Azure Event Grid event.
3. **Serverless Processing**: An Azure Function (Python) is invoked, which downloads the PDF, converts it to structured JSON (using PyMuPDF), and uploads the resulting JSON back to Azure Blob Storage.
4. **Frontend Access**: The frontend app fetches the JSON file directly from Azure Blob Storage for display, summarization, and interaction.

---

## Directory Structure

```
.
├── server/              # Node.js backend (Express, API, etc.)
│   ├── index.mjs        # Main server entry (API, summary, etc.)
│   ├── python/          # (Legacy/utility) PDF-to-JSON Python scripts
│   └── uploads/         # (Optional) Temporary PDF storage if needed
├── src/                 # React frontend
│   ├── components/      # Main UI components (UploadDialog, PartnerView, Summary, etc.)
│   └── ...              # Utilities, assets, etc.
├── public/              # Static files served by Vite
│   └── json/            # (Legacy) Output JSON files from PDF conversion
├── .env.local           # Backend secrets (OpenAI keys, Azure Blob SAS, endpoints, etc.)
├── package.json         # Project dependencies and scripts
└── README.md            # This file
```

---

## Prerequisites

- **Node.js** (v18+ recommended)
- **Azure Blob Storage account** (with SAS token or connection string)
- **Azure Function App** (Python, with PyMuPDF installed)
- **Azure Event Grid** (for blob event trigger)
- **Azure OpenAI resource** (for summarization)

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd <your-repo-folder>
```

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root (**do not commit this file!**):

```
OPENAI_API_KEY=your-azure-openai-key
OPENAI_ENDPOINT=https://your-azure-openai-endpoint
AZURE_BLOB_SAS_URL=your-azure-blob-sas-url
AZURE_BLOB_CONTAINER=your-container-name
```

### 4. Deploy/Configure Azure Function

- Deploy the provided (or your own) Python Azure Function to your Azure account.
- Ensure the function is triggered by blob upload events and has access to both the PDF and JSON containers.
- The function should use PyMuPDF to convert PDFs to JSON and upload the result back to Azure Blob Storage.

### 5. Start the backend server (if needed for summary or other APIs)

```bash
npm run server
```
- The backend runs on [http://localhost:3000](http://localhost:3000)

### 6. Start the frontend (Vite dev server)

```bash
npm run dev
```
- The frontend runs on [http://localhost:5173](http://localhost:5173)

---

## Usage

1. **Open the app in your browser:** [http://localhost:5173](http://localhost:5173)
2. **Upload a PDF:** Use the "Upload PDF" button. The file is uploaded directly to Azure Blob Storage using a SAS URL.
3. **Automatic Processing:** The upload triggers an Azure Function, which converts the PDF to JSON and stores it back in Azure Blob Storage.
4. **View & Summarize:** The frontend fetches the JSON file directly from Azure Blob Storage. Click a document to view details and generate an AI summary. Click summary sentences to highlight corresponding blocks in the original document.
5. **Project Management:** Create, rename, and delete projects. Move PDFs between "Unsorted" and projects.
6. **Chat & Explore:** Use the chat interface for further document Q&A (if enabled).

---

## Key Scripts

- **Azure Function (Python):**  
  Converts PDF to JSON using PyMuPDF and uploads the result to Azure Blob Storage.

- **Backend server:**  
  `server/index.mjs`  
  (Handles summary API, metadata, etc. as needed.)

- **Frontend entry:**  
  `src/main.jsx`, `src/components/PartnerView.jsx`, `src/components/Summary.jsx`, etc.

---

## Notes

- **OpenAI/Azure OpenAI API keys** and **Azure Blob SAS tokens** are only used on the backend and never exposed to the frontend.
- **All PDF uploads and JSON outputs are stored in Azure Blob Storage**; the backend and frontend fetch/process files as needed.
- **For production**, further security, error handling, and deployment steps are recommended.

---

## Troubleshooting

- **Azure Function errors:** Check Azure portal logs for function execution and permissions.
- **API errors:** Check `.env.local` for correct OpenAI endpoint, key, and Azure Blob SAS URL.
- **Port conflicts:** Change the `port` in `server/index.mjs` or Vite config if needed.

---

## License

This project is for MS Hackathon 2025 demo purposes only.
