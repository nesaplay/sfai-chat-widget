;(() => {
  // Wait for DOM to be fully loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget)
  } else {
    initWidget()
  }

  function initWidget() {
    // --- Find the script tag and read configuration ---
    const scriptTags = document.querySelectorAll("script")
    let currentScript = null
    let baseUrl = "http://localhost:3000" // Default base URL
    let widgetMode = "fixed" // Default mode
    let containerId = null // For inline mode

    for (const tag of scriptTags) {
      if (tag.src && tag.src.includes("widget.js")) {
        currentScript = tag
        try {
          baseUrl = new URL(tag.src).origin
        } catch (e) {
          console.error("Chat Widget: Error parsing script URL:", e)
        }
        widgetMode = tag.dataset.widgetMode || "fixed" // Read mode (default: fixed)
        containerId = tag.dataset.widgetContainerId || null // Read container ID
        break
      }
    }

    if (!currentScript) {
      console.error("Chat Widget: Could not find the widget script tag.")
      return
    }

    console.log(`Chat Widget: Initializing in ${widgetMode} mode. Base URL: ${baseUrl}`)
    // --- End Configuration Reading ---


    // Default configuration (can be overridden by script tag attributes later if needed)
    const config = {
      iframeUrl: "/widget",
      position: "bottom-right", // Used only in fixed mode
      primaryColor: "#ad46ff",   // Used only in fixed mode
      widgetSize: "60px",       // Used only in fixed mode
      widgetIconColor: "white", // Used only in fixed mode
      chatWidth: "350px",       // Used only in fixed mode
      chatHeight: "568px",      // Used only in fixed mode
    }

    // Create iframe element (common to both modes)
    const iframe = document.createElement("iframe")
    iframe.src = `${baseUrl}${config.iframeUrl}`
    console.log(`Chat Widget: iframe src: ${iframe.src}`)

    let iframeLoaded = false
    let widgetData = null // Data to send once loaded

    // Wait for iframe to load before sending messages
    iframe.onload = () => {
      console.log("Chat Widget: iframe loaded")
      iframeLoaded = true
      if (widgetData) {
        sendDataToWidget(widgetData)
      }
      // Optionally send mode info to iframe
      // iframe.contentWindow.postMessage({ type: 'widget-mode', mode: widgetMode }, '*')
    }

    // Function to send data to the iframe (common)
    function sendDataToWidget(data) {
      if (!iframe.contentWindow) {
         console.warn("Chat Widget: Iframe content window not available yet.");
         widgetData = data; // Store data to send later
         return;
      }
      if (iframeLoaded) {
        iframe.contentWindow.postMessage(
          {
            type: "widget-data",
            data: data,
          },
          "*", // Consider restricting target origin in production
        )
        console.log("Chat Widget: Data sent to iframe")
      } else {
        widgetData = data
        console.log("Chat Widget: Data stored, will send when iframe loads")
      }
    }

    // Mode-specific initialization
    if (widgetMode === 'inline' && containerId) {
      // --- Inline Mode Initialization ---
      const findAndEmbed = () => {
        const targetContainer = document.getElementById(containerId)
        if (targetContainer) {
          console.log(`Chat Widget: Embedding into container #${containerId}`)

          // Apply styles for inline mode iframe
          const styles = document.createElement("style")
          styles.innerHTML = `
            #${containerId} {
              position: relative; /* Ensure container is a positioning context */
              overflow: hidden; /* Optional: prevent iframe overflow */
            }
            .chat-widget-iframe-inline {
              border: none;
              width: 100%;
              height: 100%;
              display: block; /* Ensure it takes block space */
              position: absolute; /* Position relative to container */
              top: 0;
              left: 0;
            }
          `
          document.head.appendChild(styles)

          iframe.className = "chat-widget-iframe-inline"

          // Add iframe to the target container
          targetContainer.innerHTML = ''; // Clear the container first
          targetContainer.appendChild(iframe)

          // Expose limited API for inline mode
          window.ChatWidget = {
            sendData: (data) => {
              sendDataToWidget(data)
            },
            getIframe: () => iframe, // Expose iframe if needed
          }

          console.log("Chat Widget: Initialized in inline mode.")
        } else {
          console.warn(`Chat Widget: Container #${containerId} not found yet. Retrying...`)
          // Retry after a short delay
          setTimeout(findAndEmbed, 100) // Retry every 100ms
        }
      }

      // Start the process
      findAndEmbed();

    } else {
      // --- Fixed Mode Initialization (Default) ---
      if (widgetMode === 'inline' && !containerId) {
          console.warn("Chat Widget: 'inline' mode selected but no 'data-widget-container-id' provided. Defaulting to 'fixed' mode.");
      }
      console.log("Chat Widget: Initializing in fixed mode.")

      // Create styles for fixed mode
    const styles = document.createElement("style")
    styles.innerHTML = `
      .chat-widget-container {
        position: fixed;
        z-index: 999999;
        bottom: 20px;
        right: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }
      .chat-widget-button {
        width: ${config.widgetSize};
        height: ${config.widgetSize};
        border-radius: 50%;
        background-color: ${config.primaryColor};
        color: ${config.widgetIconColor};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
      }
      .chat-widget-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
      }
      .chat-widget-icon {
        width: 28px;
        height: 28px;
      }
        .chat-widget-iframe-fixed { /* Changed class name */
        display: none;
        border: none;
        border-radius: 16px;
        width: ${config.chatWidth};
        height: ${config.chatHeight};
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        background-color: white;
        position: absolute;
        bottom: calc(${config.widgetSize} + 10px);
        right: 0;
      }
        .chat-widget-iframe-fixed.open { /* Changed class name */
        display: block;
      }
      @media (max-width: 480px) {
          .chat-widget-iframe-fixed { /* Changed class name */
          width: calc(100vw - 40px);
          height: 60vh;
          right: 0;
          left: 0;
          margin: 0 auto;
          bottom: calc(${config.widgetSize} + 20px);
        }
      }
    `
    document.head.appendChild(styles)

    // Create widget container
    const container = document.createElement("div")
    container.className = "chat-widget-container"

    // Create chat button
    const button = document.createElement("div")
    button.className = "chat-widget-button"
    button.innerHTML = `
      <svg class="chat-widget-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `

      iframe.className = "chat-widget-iframe-fixed" // Use specific class

    // Add elements to DOM
    container.appendChild(iframe)
    container.appendChild(button)
    document.body.appendChild(container)

      // Toggle chat logic
    let isOpen = false

    button.addEventListener("click", () => {
      isOpen = !isOpen
      if (isOpen) {
        iframe.classList.add("open")
        button.innerHTML = `
          <svg class="chat-widget-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `
          // Notify iframe only if it's loaded
          if (iframeLoaded && iframe.contentWindow) {
              iframe.contentWindow.postMessage({ type: "chat-opened" }, "*")
          }
      } else {
        iframe.classList.remove("open")
        button.innerHTML = `
          <svg class="chat-widget-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        `
           // Notify iframe only if it's loaded
           if (iframeLoaded && iframe.contentWindow) {
              iframe.contentWindow.postMessage({ type: "chat-closed" }, "*")
           }
      }
    })

      // Listen for messages from iframe (e.g., iframe requests to close itself)
    window.addEventListener("message", (event) => {
        // Add origin check for security: if (event.origin !== baseUrl) return;
        if (event.data === "close-chat") { // Message sent *from* iframe
           if (isOpen) {
               button.click(); // Simulate click to close and update UI
      }
        }
        // Handle other messages if needed
      })

      // Expose the full widget API for fixed mode
    window.ChatWidget = {
      open: () => {
          if (!isOpen) button.click()
      },
      close: () => {
          if (isOpen) button.click()
      },
      toggle: () => {
        button.click()
      },
      sendData: (data) => {
        sendDataToWidget(data)
      },
         isOpen: () => isOpen, // Expose state
         getIframe: () => iframe // Expose iframe
      }

       console.log("Chat Widget: Initialized in fixed mode.")
    }

    // Common cleanup or final steps can go here if needed
  }
})()
