function sendHeight() {
  const height = document.body.scrollHeight
  window.parent.postMessage({ type: "scrutinResize", height: height }, "*")
}

// Envoie la hauteur au chargement
window.addEventListener("load", sendHeight)

// Envoie la hauteur si le contenu change
const observer = new MutationObserver(sendHeight)
observer.observe(document.body, { childList: true, subtree: true })

console.log("sendHeight")
