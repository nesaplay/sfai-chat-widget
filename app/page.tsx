import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  // Use localhost:3000 as the default during development
  const hostUrl = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000"

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex items-center h-16 px-4 mx-auto">
          <h1 className="text-2xl font-bold">Chat Widget</h1>
          <nav className="ml-auto">
            <Link href="/demo-data" passHref>
              <Button variant="outline">Demo</Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="container px-4 py-12 mx-auto">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">Embed a chatbot on your website in seconds</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Add this simple script tag to your website to include an AI-powered chat widget.
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
              <pre className="overflow-x-auto text-sm">
                <code>{`<script src="${hostUrl}/widget.js"></script>`}</code>
              </pre>
            </div>

            <div className="p-4 border rounded-lg bg-yellow-50 text-yellow-800">
              <h3 className="text-lg font-semibold mb-2">Local Development</h3>
              <p>You're currently running in development mode. To test the widget on other local websites:</p>
              <ol className="list-decimal ml-5 mt-2 space-y-1">
                <li>Make sure this Next.js app is running on port 3000</li>
                <li>Add the script tag shown above to any local HTML file</li>
                <li>Open that HTML file in a browser</li>
                <li>If you encounter CORS issues, you may need to run your test page on a local server</li>
              </ol>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold">Features</h3>
              <ul className="ml-6 space-y-2 list-disc">
                <li>Lightweight embed that won't slow down your site</li>
                <li>Responsive design that works on all devices</li>
                <li>Customizable appearance</li>
                <li>Powered by AI for intelligent responses</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t">
        <div className="container flex items-center h-16 px-4 mx-auto">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Chat Widget. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
