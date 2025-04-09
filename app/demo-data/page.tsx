"use client"

export default function DemoDataPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex items-center h-16 px-4 mx-auto">
          <h1 className="text-2xl font-bold">Data Passing Demo</h1>
        </div>
      </header>
      <main className="flex-1">
        <div className="container px-4 py-12 mx-auto">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">Send Data to Chat Widget</h2>
              <p className="text-gray-500 dark:text-gray-400">
                This page demonstrates how to send data from your application to the chat widget.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="mb-4 text-lg font-medium">Actions</h3>
              <div className="space-y-2">
                <button
                  className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                  onClick={() => {
                    if (window.ChatWidget) {
                      // You can send any data structure you want
                      window.ChatWidget.sendData({
                        // This is just an example - you can define your own data structure
                        pageInfo: {
                          title: "Data Passing Demo",
                          url: window.location.href,
                        },
                        userData: {
                          loggedIn: true,
                          username: "demo_user",
                        },
                      })
                      window.ChatWidget.open()
                    }
                  }}
                >
                  Send Data & Open Chat
                </button>
                <button
                  className="w-full px-4 py-2 text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50"
                  onClick={() => {
                    if (window.ChatWidget) {
                      window.ChatWidget.toggle()
                    }
                  }}
                >
                  Toggle Chat Widget
                </button>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50">
              <h3 className="mb-2 text-lg font-medium">Code Example</h3>
              <pre className="p-4 overflow-x-auto text-sm bg-gray-900 text-gray-100 rounded">
                {`// Send data to the chat widget
window.ChatWidget.sendData({
  // Your data structure here
  data: "you want"
});

// Open the chat widget
window.ChatWidget.open();`}
              </pre>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t">
        <div className="container flex items-center h-16 px-4 mx-auto">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Data Passing Demo. All rights reserved.
          </p>
        </div>
      </footer>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Add the widget script dynamically
            const script = document.createElement('script');
            script.src = '/widget.js';
            script.async = true;
            document.body.appendChild(script);
          `,
        }}
      />
    </div>
  )
}
