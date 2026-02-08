# PDFinery

A frontend-only Next.js application that allows users to interact with PDF files in a easy-to use manner. A useful toolkit for PDF actions

## Features

- **Upload Multiple PDFs**: Drag and drop or click to upload multiple PDF files
- **Page Preview**: View any page at full size with navigation controls
- **Drag-and-Drop Reordering**: Easily reorder pages by dragging thumbnails
- **Delete Pages**: Remove unwanted pages from the final output
- **Download Merged PDF**: Export the final merged PDF with your custom page order
- **Sign PDF**: Visually add a signature and download the PDF with the added signature
- **Convert PDF**: Convert PDF file to text or image
- **Split PDF by range**: Split PDF by page ranges, N pages, single pages
- **Extract PDF pages**: Extract selected pages from PDF
- **Privacy First**: All processing happens in your browser - files never leave your device


## Tech Stack

- **Next.js 14** with App Router
- **React 18**
- **TypeScript**
- **shadcn/ui** (Radix UI + Tailwind CSS)
- **pdf-lib** for PDF manipulation
- **pdfjs-dist** for PDF rendering
- **@dnd-kit** for drag-and-drop functionality

## Project Structure

- **app/** (Next.js App Router)
  - **convert/**
    - page.tsx
  - **organize/**
    - page.tsx
  - **sign-pdf/**
    - page.tsx
  - globals.css
  - layout.tsx
  - page.tsx
  - robots.ts
  - sitemap.ts

- **components/**
  - **layout/**
    - AdContainer.tsx
    - PageContainer.tsx
  - **ui/** (shadcn/ui components)
    - button.tsx
    - card.tsx
    - input.tsx
  - DownloadButton.tsx
  - Footer.tsx
  - Header.tsx
  - MainPageView.tsx
  - PageThumbnails.tsx
  - PDFProvider.tsx
  - PDFUploader.tsx
  - SortableFileList.tsx

- **contexts/**
  - PDFContext.tsx

- **lib/**
  - conversionUtils.ts
  - pdfUtils.ts
  - types.ts
  - utils.ts

- **public/**
  - content.md
  - llm.txt
  - llms.txt
  - logo-small.png
  - logo.png

- **Configuration Files**
  - .eslintrc.json
  - .gitattributes
  - .gitignore
  - components.json
  - next.config.js
  - package.json
  - postcss.config.js
  - PROJECT.md
  - README.md
  - tailwind.config.js
  - tsconfig.json

## Feature Scope

### In Scope
- PDF merge, split, reorder
- Client-side processing (WASM)
- SEO-friendly tool pages

### Out of Scope (for now)
- User accounts
- Cloud storage
- Server-side PDF processing


## Current Status
- Core layout implemented
- Ad containers reserved
- PDF merge working
- PDF visual sign working
- PDF to IMG working
- PDF to Text working
- PDF split working

## Core Principles
### Browser-only processing (no server uploads)
### Privacy-first
### Global layout rule (must not be violated)

- All pages must render inside the existing centered content container that reserves left and right side space for banner ads.
- Do not use full-width layouts
- Do not overlap or push side ad areas
- Use the shared layout / container components
- Ads may be hidden on tablet/mobile, but space must exist on desktop
- If a feature needs layout changes, it must adapt to the container, not replace it.
- Navbar invariant: navbar is full-width and outside the content+ads container. Ads/content start below it.
- Footer invariant: footer is full-width and outside the content+ads container. Ads/content start above it.

### On new page add
- Add the new page link to the navbar
- Add the new page to the landing page of the website with the appropriate information
- Add the appropriate metadata and optimize SEO

### On page edit
- Update existing navbar link if the name changes
- Update the landing page of the website with the appropriate information
- Tune the existing metadata and optimize SEO

### On page delete
- Remove existing navbar link if the name changes
- Remove the landing page of the website with the appropriate information
- Tune the existing metadata and optimize SEO

## AI / Agent Instructions

- Do not break the global layout
- **Respect Core Principles**
- Optimize for clarity and monetization
- Ask before changing architecture