export default function DemoPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex items-center h-16 px-4 mx-auto">
          <h1 className="text-2xl font-bold">Demo Page</h1>
        </div>
      </header>
      <main className="flex-1">
        <div className="container px-4 py-12 mx-auto">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">Widget Demo</h2>
              <p className="text-gray-500 dark:text-gray-400">
                This page demonstrates how the chat widget appears on your website. Look for the chat icon in the bottom
                right corner.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="mb-2 text-lg font-medium">Sample Website Content</h3>
              <p className="mb-4">
                This is an example of how your website content would appear alongside the chat widget. The widget is
                non-intrusive and only expands when clicked.
              </p>
              <p>Try clicking the chat icon in the bottom right corner to start a conversation!</p>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t">
        <div className="container flex items-center h-16 px-4 mx-auto">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Chat Widget Demo. All rights reserved.
          </p>
        </div>
      </footer>

      {/* The widget script is included in layout.tsx */}
    </div>
  )
}
