# Statement Intelligence

Turn raw bank statements into clarity—in under a minute.

## Overview

Statement Intelligence is a personal expense tracker that helps you understand where your money goes by analyzing bank statements (PDF or CSV). The app provides instant categorization, spending insights, and learns from your corrections to improve accuracy over time.

## Features

- **Multi-file Upload**: Upload multiple bank statements at once
- **AI-Powered Categorization**: Automatically categorizes transactions into 9 categories
- **Learning Memory**: Remembers your category corrections and applies them to future uploads
- **Drill-Down Views**: Navigate from month totals → categories → individual transactions
- **Inline Editing**: Edit categories directly without page reloads
- **Privacy First**: All data stored locally in your browser (localStorage)

## How to Run Locally

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

### Mock AI Analyzer

The app includes a mock AI analyzer (`lib/mock-analyzer.ts`) that:

1. **Parses Files**: Simulates parsing PDF/CSV files and extracts transactions
2. **Categorizes**: Uses keyword matching to auto-categorize transactions
3. **Learns**: Checks learning rules first before applying default categorization
4. **Generates Mock Data**: Creates realistic transaction data for testing

### Learning Memory System

When you correct a transaction's category:

1. The app saves a learning rule mapping the merchant name to the category
2. On future uploads, if the same merchant appears, it uses your saved category
3. Learning rules take precedence over AI categorization
4. Rules are stored in localStorage and persist across sessions

### Data Model

\`\`\`
Month
├── id: string (e.g., "march-2025")
├── name: string (e.g., "March")
├── year: number
├── totalSpend: number
└── transactionCount: number

Transaction
├── id: string
├── date: string
├── description: string
├── amount: number
├── category: Category
├── sourceFile: string
└── monthId: string

LearningRule
├── merchantPattern: string
├── category: Category
└── lastUsed: string
\`\`\`

## Project Structure

\`\`\`
app/
├── page.tsx                 # Landing page
├── upload/page.tsx          # Upload & preview page
├── month/[monthId]/page.tsx # Month detail view
└── months/page.tsx          # All months overview

components/
├── file-upload.tsx          # Multi-file upload component
├── transaction-preview.tsx  # Preview table with inline editing
└── category-card.tsx        # Collapsible category with transactions

lib/
├── types.ts                 # TypeScript types
├── mock-analyzer.ts         # Mock AI analyzer & file parser
└── storage.ts               # localStorage utilities
\`\`\`

## Future Enhancements

Where real parsing logic will be added:

1. **Real PDF/CSV Parsing**: Replace mock parser with actual file parsing libraries
2. **AI Integration**: Connect to real AI model for categorization (OpenAI, Anthropic, etc.)
3. **Backend Storage**: Move from localStorage to database (Supabase, Neon, etc.)
4. **Advanced Analytics**: Add charts, trends, and budget tracking
5. **Export Features**: Export data to CSV, PDF reports
6. **Multi-user Support**: Add authentication and user accounts

## Categories

The app supports 9 spending categories:

- Groceries
- Dining
- Transportation
- Entertainment
- Shopping
- Bills
- Healthcare
- Travel
- Other

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Storage**: localStorage (browser-based)
- **TypeScript**: Full type safety

## License

MIT
