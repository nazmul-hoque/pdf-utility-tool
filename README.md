# PDF Utility Tool 🔧

A comprehensive, browser-based PDF manipulation tool built with Next.js, React, and TypeScript. Create, merge, compress, convert, and perform advanced operations on PDF documents with a beautiful, responsive interface.

![PDF Utility Tool](https://img.shields.io/badge/PDF-Utility%20Tool-blue?style=for-the-badge&logo=pdf&logoColor=white)

## ✨ Features

### 📄 Core PDF Operations
- **Create PDFs** from images or text
- **Merge multiple PDFs** with drag-and-drop reordering
- **Compress PDF files** to reduce size
- **Convert documents** (Word, Excel, Text, HTML) to PDF

### 🔧 Advanced PDF Operations
- **Split PDFs** into multiple documents
- **Extract specific pages** from PDFs
- **Rotate pages** with visual interface (90°, 180°, 270°)
- **Password protection** for PDFs
- **Text extraction** from PDF documents
- **Metadata viewing** and document information

### 🎨 User Experience
- **Responsive design** - works on desktop and mobile
- **Dark/Light theme** toggle
- **Real-time progress** indicators
- **Drag-and-drop** file uploads
- **Live PDF preview** with react-pdf
- **File reordering** with visual controls

### 🛡️ Security Features
- **XSS protection** with HTML sanitization
- **File validation** with size and type checking
- **Extension verification** to prevent malicious uploads
- **Content Security Policy** headers
- **Input sanitization** for all user content

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pdf-utility-tool.git
   cd pdf-utility-tool
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.4.2** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components

### PDF Processing
- **pdf-lib** - PDF manipulation
- **react-pdf** - PDF viewing
- **jsPDF** - PDF generation
- **html2canvas** - HTML to canvas conversion

### Document Conversion
- **mammoth** - Word document processing
- **xlsx** - Excel file handling
- **crypto-js** - Encryption utilities

## 📱 Usage

### Creating PDFs
1. Navigate to the **Create PDF** tab
2. Upload images or enter text
3. Click "Create PDF" to generate your document

### Merging PDFs
1. Go to the **Merge PDFs** tab
2. Upload multiple PDF files
3. Reorder files using the arrow buttons
4. Click "Merge PDFs" to combine them

### Advanced Operations
1. Visit the **Advanced PDF** tab
2. Upload a PDF file
3. Choose from operations like split, extract, rotate, or protect
4. Configure settings and apply changes
5. Preview and download results

## 🏗️ Project Structure

```
pdf-utility-tool/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main application
├── components/            # React components
│   ├── ui/               # Shadcn/ui components
│   ├── pdf-preview-modal.tsx
│   └── theme-provider.tsx
├── lib/                   # Utility libraries
│   ├── pdf-utils.ts      # PDF processing logic
│   └── utils.ts          # General utilities
├── public/               # Static assets
└── styles/              # Additional styles
```

## 🔒 Security

This application implements multiple security measures:

- **XSS Protection**: HTML content sanitization
- **File Validation**: Size limits and type checking
- **Extension Verification**: Prevents malicious file uploads
- **Content Security Policy**: HTTP security headers
- **Input Sanitization**: All user inputs are validated

See [SECURITY.md](./SECURITY.md) for detailed security information.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
1. Follow TypeScript best practices
2. Maintain responsive design principles
3. Add security considerations for new features
4. Update documentation for new functionality

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [pdf-lib](https://pdf-lib.js.org/) - Excellent PDF manipulation library
- [Shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Lucide React](https://lucide.dev/) - Icon library
- [Next.js](https://nextjs.org/) - Amazing React framework

## 🐛 Issues & Support

If you encounter any problems or have suggestions:

1. Check existing [Issues](https://github.com/yourusername/pdf-utility-tool/issues)
2. Create a new issue with detailed information
3. Include browser version and steps to reproduce

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy to Vercel
```

### Docker
```bash
# Build image
docker build -t pdf-utility-tool .

# Run container
docker run -p 3000:3000 pdf-utility-tool
```

---

**Made with ❤️ by [Your Name]**

*A powerful, secure, and user-friendly PDF utility tool for everyone.*
