# PDF Merger

A frontend-only Next.js application that allows users to upload, merge, reorder, and download PDF files with an intuitive drag-and-drop interface.

## Features

- **Upload Multiple PDFs**: Drag and drop or click to upload multiple PDF files
- **Page Preview**: View any page at full size with navigation controls
- **Drag-and-Drop Reordering**: Easily reorder pages by dragging thumbnails
- **Delete Pages**: Remove unwanted pages from the final output
- **Download Merged PDF**: Export the final merged PDF with your custom page order
- **Privacy First**: All processing happens in your browser - files never leave your device

## Tech Stack

- **Next.js 14** with App Router
- **React 18**
- **TypeScript**
- **shadcn/ui** (Radix UI + Tailwind CSS)
- **pdf-lib** for PDF manipulation
- **pdfjs-dist** for PDF rendering
- **@dnd-kit** for drag-and-drop functionality

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository or navigate to the project folder:

```bash
cd pdf-merger
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload PDFs**: Click the upload area or drag and drop PDF files
2. **Preview Pages**: Click on any thumbnail to see the full page preview
3. **Reorder Pages**: Drag and drop thumbnails to change the page order
4. **Delete Pages**: Hover over a thumbnail and click the X button to remove it
5. **Download**: Click "Download Merged PDF" to save your merged document

## Project Structure

```
pdf-merger/
├── app/
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Main application page
│   └── globals.css       # Global styles and CSS variables
├── components/
│   ├── ui/               # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   ├── PDFUploader.tsx   # File upload component
│   ├── MainPageView.tsx  # Full page preview component
│   ├── PageThumbnails.tsx # Thumbnail grid with drag-and-drop
│   └── DownloadButton.tsx # Merge and download component
├── lib/
│   ├── pdfUtils.ts       # PDF processing utilities
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions
└── ...config files
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT
