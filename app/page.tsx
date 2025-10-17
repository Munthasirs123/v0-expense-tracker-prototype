import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, FileText } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-lg font-semibold">Statement Intelligence</span>
            </div>
            <Link href="/months">
              <Button variant="ghost" size="sm">
                View Past Months
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-balance">See where your money goes</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              Upload your bank statements and get instant clarity on your spending. No bank connections, no
              spreadsheets—just simple insights in under a minute.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/upload">
              <Button size="lg" className="text-base px-8 gap-2">
                Upload Bank Statements
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            <div className="space-y-2">
              <div className="text-3xl font-bold">{"<60s"}</div>
              <div className="text-sm text-muted-foreground">From upload to insights</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-muted-foreground">Private & local</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">Smart</div>
              <div className="text-sm text-muted-foreground">Learns from your edits</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Turn raw statements into clarity—in under a minute
        </div>
      </footer>
    </div>
  )
}
