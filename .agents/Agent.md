# 🤖 SQL Agent --- Next.js + TypeScript Edition

Metadata-first Text-to-SQL Web System\
Stack: Next.js 14/15 (App Router) + TypeScript + Mantine UI + Groq
(meta-llama/llama-4-scout-17b-16e-instruct)\
Deployment: Vercel (\$0 Budget Strategy)

------------------------------------------------------------------------

## 📌 Overview

SQL Agent adalah sistem Text-to-SQL berbasis web yang:

-   Mengubah file `.sql` menjadi Schema Metadata
-   Mengirim metadata + pertanyaan user ke LLM
-   Menghasilkan SELECT-only PostgreSQL query
-   Tanpa koneksi database langsung (Zero-DB Architecture)

Pendekatan utama: Metadata-first architecture untuk: - Mengurangi token
usage - Meningkatkan akurasi JOIN - Menghindari destructive query

------------------------------------------------------------------------
PROJECT STRUCTURE

    /src
      /app
        page.tsx
        layout.tsx
      /actions
        generate-sql.ts
      /components
        SchemaUploader.tsx
        SqlOutput.tsx
        ChatInput.tsx
      /utils
        parser.ts
      /types
        database.d.ts

# 🧠 Agent Architecture

Sistem terdiri dari 3 agent modular berbasis TypeScript logic.

------------------------------------------------------------------------

# 1️⃣ Schema Parser Agent

Location: `/src/utils/parser.ts`\
Execution Context: Server Side (Next.js Server Action)

## 🎯 Responsibility

-   Parsing file `.sql`
-   Mengekstrak nama tabel, kolom, relasi (FOREIGN KEY)
-   Mengabaikan INSERT, DROP, COMMENT, TRIGGER

## 🧩 Output Contract

``` ts
export interface SchemaMetadata {
  tables: {
    name: string
    columns: string[]
  }[]
  relations: string[]
}
```

------------------------------------------------------------------------

# 2️⃣ SQL Architect Agent

Location: `/src/actions/generate-sql.ts`\
Execution Context: Server Action

## 🎯 Responsibility

-   Menerima userQuestion + SchemaMetadata
-   Menghasilkan raw SELECT-only PostgreSQL query

## 📜 System Prompt

    You are a TypeScript-based SQL Architect.

    Rules:
    - Generate SELECT-only PostgreSQL queries.
    - Use only provided metadata.
    - Handle JOIN logic using given relations.
    - Output raw SQL only.
    - No explanation.

------------------------------------------------------------------------

# 3️⃣ UI Formatter Agent

Location: `/src/components/SqlOutput.tsx`\
Execution Context: Client Component

## 🎯 Responsibility

-   Pretty print SQL
-   Render syntax highlighting
-   Provide Copy to Clipboard

------------------------------------------------------------------------

# 🔐 Security Model

-   Zero-Database Strategy (No DB execution)
-   Groq API Key stored in `.env`
-   Server-side only LLM invocation
-   Query sanitization before return

------------------------------------------------------------------------

# 💰 Cost Optimization

-   Metadata-first token reduction
-   Single-shot inference
-   Deployed on Vercel Free Tier

------------------------------------------------------------------------

# 🚀 Future Improvements

-   Zod Validation
-   Prompt Caching
-   Query History
-   PDF / Markdown Export
-   Explain Query Mode

------------------------------------------------------------------------

# 🧠 Philosophy

"Small metadata, strong prompt"

This system is not a generic chatbot.\
It is a deterministic SQL architect powered by metadata.

