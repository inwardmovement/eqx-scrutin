function sendIframeHeight() {
  const height = document.documentElement.scrollHeight
  window.parent.postMessage({ type: "iframeHeight", height: height }, "*")
}

// Envoie la hauteur au chargement
window.addEventListener("load", sendIframeHeight)

// Envoie la hauteur si le contenu change
const observer = new MutationObserver(sendIframeHeight)
observer.observe(document.body, { childList: true, subtree: true })
