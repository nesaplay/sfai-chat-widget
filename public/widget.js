;(() => {
  // Wait for DOM to be fully loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget)
  } else {
    initWidget()
  }

  function initWidget() {
    // Configuration
    const config = {
      iframeUrl: "/widget",
      position: "bottom-right",
      primaryColor: "#ad46ff",
      widgetSize: "60px",
      widgetIconColor: "white",
      chatWidth: "350px",
      chatHeight: "568px",
    }

    // Create styles
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
      .chat-widget-iframe {
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
      .chat-widget-iframe.open {
        display: block;
      }
      @media (max-width: 480px) {
        .chat-widget-iframe {
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

    // Create iframe
    const iframe = document.createElement("iframe")
    iframe.className = "chat-widget-iframe"

    // Get the base URL from the script tag
    const scriptTags = document.querySelectorAll("script")
    let baseUrl = "http://localhost:3000" // Default to localhost for development

    // Try to find the widget script
    for (const tag of scriptTags) {
      if (tag.src && tag.src.includes("widget.js")) {
        try {
          baseUrl = new URL(tag.src).origin
          break
        } catch (e) {
          console.error("Error parsing script URL:", e)
        }
      }
    }

    iframe.src = `${baseUrl}${config.iframeUrl}`
    console.log(`Chat widget iframe src: ${iframe.src}`)

    // Add elements to DOM
    container.appendChild(iframe)
    container.appendChild(button)
    document.body.appendChild(container)

    // Toggle chat
    let isOpen = false
    let iframeLoaded = false

    // Store data
    let widgetData = null

    // Wait for iframe to load before sending messages
    iframe.onload = () => {
      console.log("Chat widget iframe loaded")
      iframeLoaded = true
      // If we have data, send it immediately
      if (widgetData) {
        sendDataToWidget(widgetData)
      }
    }

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
        iframe.contentWindow.postMessage({ type: "toggle-chat" }, "*")
      } else {
        iframe.classList.remove("open")
        button.innerHTML = `
          <svg class="chat-widget-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        `
        iframe.contentWindow.postMessage({ type: "toggle-chat" }, "*")
      }
    })

    // Listen for messages from iframe
    window.addEventListener("message", (event) => {
      // For security in production, you would check event.origin here
      if (event.data === "close-chat") {
        isOpen = false
        iframe.classList.remove("open")
        button.innerHTML = `
          <svg class="chat-widget-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        `
      }
    })

    // Function to send data to the iframe
    function sendDataToWidget(data) {
      if (iframeLoaded) {
        iframe.contentWindow.postMessage(
          {
            type: "widget-data",
            data: data,
          },
          "*",
        )
        console.log("Data sent to chat widget")
      } else {
        // Store the data to send once iframe is loaded
        widgetData = data
        console.log("Data stored for when iframe loads")
      }
    }

    // Expose the widget API to the parent window
    window.ChatWidget = {
      open: () => {
        if (!isOpen) {
          button.click()
        }
      },
      close: () => {
        if (isOpen) {
          button.click()
        }
      },
      toggle: () => {
        button.click()
      },
      sendData: (data) => {
        sendDataToWidget(data)
      },
    }

    // Log that the widget has been initialized
    console.log("Chat widget initialized successfully")
  }
})()
