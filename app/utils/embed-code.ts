/**
 * Génère le code d'intégration iframe pour un résultat de scrutin
 * @param embedUrl - L'URL complète de la page de résultat avec le paramètre d=embed
 * @returns Le code HTML complet pour intégrer l'iframe
 */
export function generateEmbedCode(embedUrl: string): string {
  // Parser l'URL pour encoder uniquement les paramètres non encodés
  // Cela évite le double encodage (ex: %20 devient %2520)
  try {
    const url = new URL(embedUrl)
    const params = new URLSearchParams(url.search)

    // Reconstruire l'URL avec les paramètres correctement encodés
    // URLSearchParams encode automatiquement les valeurs, mais on doit préserver les ~
    const encodedParams = Array.from(params.entries())
      .map(([key, value]) => {
        // Encoder la valeur en préservant les ~
        const encodedValue = encodeURIComponent(value).replace(/%7E/g, "~")
        return `${key}=${encodedValue}`
      })
      .join("&")

    const encodedUrl = `${url.origin}${url.pathname}?${encodedParams}${url.hash}`

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
  } catch (error) {
    // Fallback si l'URL n'est pas valide : encoder avec encodeURI en préservant les ~
    const encodedUrl = encodeURI(embedUrl).replace(/%7E/g, "~")
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
}
