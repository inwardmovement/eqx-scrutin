/**
 * Génère le code d'intégration iframe pour un résultat de scrutin
 * @param embedUrl - L'URL complète de la page de résultat avec le paramètre d=embed
 * @returns Le code HTML complet pour intégrer l'iframe
 */
export function generateEmbedCode(embedUrl: string): string {
  // Encoder l'URL pour l'attribut HTML en préservant les ~ (sans les encoder en %7E)
  // On encode l'URL complète mais on remplace %7E par ~ pour préserver les séparateurs
  const encodedUrl = encodeURI(embedUrl).replace(/%7E/g, "~")
  
  // Échapper uniquement les guillemets doubles pour éviter de casser l'attribut HTML
  const escapedUrl = encodedUrl.replace(/"/g, "&quot;")
  
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
