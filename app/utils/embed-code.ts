/**
 * Génère le code d'intégration iframe pour un résultat de scrutin
 * @param embedUrl - L'URL complète de la page de résultat avec le paramètre d=embed
 * @returns Le code HTML complet pour intégrer l'iframe
 */
export function generateEmbedCode(embedUrl: string): string {
  // Échapper l'URL pour l'attribut HTML sans la ré-encoder
  // L'URL est déjà correctement encodée (avec les ~ préservés)
  // On échappe uniquement les caractères HTML spéciaux (&, <, >, ", ')
  const escapedUrl = embedUrl
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
  
  return `<iframe title="Résultat du scrutin" id="iframeResize" style="border: none; width: 100%; height: 500px" src="${escapedUrl}"></iframe>
    <script>
      const iframeResize = document.querySelector("#iframeResize")
      window.addEventListener("message", function (event) {
        if (event.data.type === "iframeHeight") {
          iframeResize.style.height = event.data.height + "px"
        }
      })
    </script>`
}
