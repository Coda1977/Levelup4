# LevelUp Management Training Platform

A comprehensive management training platform built with Next.js, TypeScript, and Supabase.

## Features

- **Structured Learning**: Categorized chapters with professional typography and reading experience
- **Audio Narration**: OpenAI TTS-generated audio for each chapter
- **Admin Panel**: Complete content management system with WYSIWYG editor
- **Responsive Design**: Mobile-optimized with clean, professional styling
- **Multi-media Support**: Podcast and video embedding capabilities

## Tech Stack

- **Frontend**: Next.js 15.5.3, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Audio**: OpenAI Text-to-Speech API
- **Editor**: TipTap rich text editor
- **Deployment**: Vercel-ready

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Levelup4.git
   cd Levelup4
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then fill in your:
   - Supabase URL and keys
   - OpenAI API key

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                 # Next.js 15 App Router
│   ├── admin/          # Admin panel
│   ├── api/            # API routes
│   └── learn/          # Learning pages
├── components/         # Reusable components
└── lib/               # Utilities and configurations

supabase/
└── migrations/        # Database migrations
```

## Key Features

### Learning Experience
- Professional typography with optimal reading experience
- Audio narration for each chapter (pre-generated)
- Progress tracking and reading time estimates
- Mobile-responsive design

### Admin Panel
- WYSIWYG content editor (TipTap)
- Drag-and-drop chapter reordering
- Audio generation with OpenAI TTS
- Category and chapter management

### Content Management
- Rich text editing with HTML output
- Multi-media embedding (podcast, video)
- Automatic reading time calculation
- Content migration tools

## Development

This repository follows a branch-based development workflow:

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Individual features
- `fix/*` - Bug fixes

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Private project - All rights reserved

## Status

🚧 **Currently in development** - Working on architecture improvements and preparing for AI Coach and User Dashboard features.