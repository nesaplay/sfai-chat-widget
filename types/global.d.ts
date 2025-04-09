interface Window {
  ChatWidget?: {
    open: () => void
    close: () => void
    toggle: () => void
    sendData: (data: any) => void
  }
}
