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
- **Optimize PDF**: Compress PDF, reduce image quality, remove metadata
- **Internationalization**: Support for multiple languages (English, Turkish) with instant switching and localized URLs
- **Privacy First**: All processing happens in your browser - files never leave your device


## Tech Stack

- **Next.js 14** with App Router
- **React 18**
- **TypeScript**
- **shadcn/ui** (Radix UI + Tailwind CSS)
- **pdf-lib** for PDF manipulation
- **pdfjs-dist** for PDF rendering
- **@dnd-kit** for drag-and-drop functionality
- **next-intl** for internationalization (i18n)

## Project Structure

- **app/** (Next.js App Router)
  - **[locale]/**
    - **convert/**
      - page.tsx
    - **optimize/**
      - page.tsx
    - **organize/**
      - page.tsx
    - **sign-pdf/**
      - page.tsx
    - **split/**
      - page.tsx
    - layout.tsx
    - page.tsx
  - globals.css
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
    - select.tsx
  - DownloadButton.tsx
  - Footer.tsx
  - Header.tsx
  - LanguageSelect.tsx
  - MainPageView.tsx
  - PageThumbnails.tsx
  - PDFProvider.tsx
  - PDFUploader.tsx
  - SortableFileList.tsx

- **contexts/**
  - PDFContext.tsx

- **i18n/**
  - request.ts
  - routing.ts

- **lib/**
  - conversionUtils.ts
  - navigation.ts
  - optimizeUtils.ts
  - pdfUtils.ts
  - types.ts
  - utils.ts

- **messages/**
  - en.json
  - tr.json

- **public/**
  - **flags/**
    - tr.svg
    - us.svg
  - **logos/**
    - logo-small.png
    - logo.png
  - content.md
  - llm.txt
  - llms.txt

- **Configuration Files**
  - .eslintrc.json
  - .gitattributes
  - .gitignore
  - components.json
  - middleware.ts
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
- Internationalization (i18n)

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
- PDF optimize working
- Internationalization implemented (EN/TR)

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

### Global internationalization rule (must not be violated)
- At every page translate every user-seen text 
- Use messages folder to add, remove or edit translated text
- At every language addition update messages directory
- At language select component use public/flags directory for corresponding flag

## AI / Agent Instructions

### Do not break the global layout
### **Respect Core Principles**
### Optimize for clarity and monetization
### Ask before changing architecture

### On new page add
- Add the new page link to the navbar
- Add the new page to the landing page of the website with the appropriate information
- Add the appropriate metadata and optimize SEO
- Update PROJECT.md Project Structure, Tech Stack and Features accordingly

### On page edit
- Update existing navbar link if the name changes
- Update the landing page of the website with the appropriate information
- Tune the existing metadata and optimize SEO
- Update PROJECT.md Project Structure, Tech Stack and Features accordingly

### On page delete
- Remove existing navbar link if the name changes
- Remove the landing page of the website with the appropriate information
- Tune the existing metadata and optimize SEO
- Update PROJECT.md Project Structure, Tech Stack and Features accordingly