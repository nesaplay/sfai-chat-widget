export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Chat Widget Test Page</h1>
      <p className="mb-4">This is a simple test page to verify that the chat widget is loading correctly.</p>
      <p>You should see a blue chat button in the bottom right corner of this page.</p>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Troubleshooting</h2>
        <ul className="list-disc pl-5">
          <li>Check the browser console for any errors</li>
          <li>Verify that the widget.js script is being loaded</li>
          <li>Make sure there are no CSS conflicts with z-index</li>
        </ul>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            console.log('Test page loaded');
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
