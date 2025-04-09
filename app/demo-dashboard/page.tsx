"use client"

export default function DemoDashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex items-center h-16 px-4 mx-auto">
          <h1 className="text-2xl font-bold">Dashboard Demo</h1>
        </div>
      </header>
      <main className="flex-1">
        <div className="container px-4 py-12 mx-auto">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">Dashboard with Chat Widget</h2>
              <p className="text-gray-500 dark:text-gray-400">
                This page demonstrates how to send dashboard data to the chat widget.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h3 className="mb-2 text-lg font-medium">Monthly Revenue</h3>
                <p className="text-3xl font-bold">$24,500</p>
                <p className="text-sm text-green-500">↑ 12% from last month</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="mb-2 text-lg font-medium">Active Users</h3>
                <p className="text-3xl font-bold">1,234</p>
                <p className="text-sm text-green-500">↑ 8% from last month</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="mb-2 text-lg font-medium">Conversion Rate</h3>
                <p className="text-3xl font-bold">3.2%</p>
                <p className="text-sm text-red-500">↓ 0.5% from last month</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="mb-2 text-lg font-medium">Avg. Session Duration</h3>
                <p className="text-3xl font-bold">4m 12s</p>
                <p className="text-sm text-green-500">↑ 15% from last month</p>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="mb-4 text-lg font-medium">Actions</h3>
              <div className="space-y-2">
                <button
                  className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                  onClick={() => {
                    if (window.ChatWidget) {
                      window.ChatWidget.sendData({
                        metrics: [
                          { name: "Monthly Revenue", value: "$24,500" },
                          { name: "Active Users", value: 1234 },
                          { name: "Conversion Rate", value: "3.2%" },
                          { name: "Avg. Session Duration", value: "4m 12s" },
                        ],
                        charts: [
                          { title: "Revenue Trend (Last 6 Months)", data: {} },
                          { title: "User Growth", data: {} },
                        ],
                      })
                      window.ChatWidget.open()
                    }
                  }}
                >
                  Send Dashboard Data to Chat
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
          </div>
        </div>
      </main>
      <footer className="border-t">
        <div className="container flex items-center h-16 px-4 mx-auto">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Dashboard Demo. All rights reserved.
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
