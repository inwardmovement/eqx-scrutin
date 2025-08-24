import { NextRequest, NextResponse } from "next/server"
import { processDocument } from "../actions"
import { formatDataForUrl } from "../utils/url-format"

export async function POST(request: NextRequest) {
  try {
    // Vérifier que la requête contient un fichier
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Aucun fichier fourni. Utilisez le paramètre 'file' pour envoyer le fichier CSV.",
        },
        { status: 400 },
      )
    }

    // Vérifier le type de fichier
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        {
          success: false,
          error: "Le fichier doit être au format CSV (.csv)",
        },
        { status: 400 },
      )
    }

    // Vérifier la taille du fichier (limite à 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le fichier est trop volumineux. Taille maximum autorisée : 10MB",
        },
        { status: 400 },
      )
    }

    // Créer un FormData avec le fichier et forcer la version 5 mentions
    const analysisFormData = new FormData()
    analysisFormData.append("document", file)
    analysisFormData.append("isVersion6", "false") // Force la version 5 mentions

    // Traiter le document
    const result = await processDocument(analysisFormData)

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Erreur lors de l'analyse du fichier",
        },
        { status: 400 },
      )
    }

    // Formater les données pour l'URL
    const urlData = formatDataForUrl(result.data)

    // Construire l'URL de résultat
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://eqx-scrutin.vercel.app"
    const resultUrl = `${baseUrl}/result?data=${encodeURIComponent(urlData)}`

    return NextResponse.json({
      success: true,
      result: resultUrl,
    })
  } catch (error) {
    console.error("Erreur API:", error)

    // Gérer les erreurs spécifiques
    if (error instanceof Error) {
      if (error.message.includes("CSV")) {
        return NextResponse.json(
          {
            success: false,
            error: "Erreur de format CSV : " + error.message,
          },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Erreur interne : " + error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "Erreur inconnue lors du traitement de la requête",
      },
      { status: 500 },
    )
  }
}

// Bloquer les autres méthodes HTTP
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Envoyer un fichier CSV (paramètre `file` au format `FormData`) via une requête POST (voir https://github.com/inwardmovement/eqx-scrutin?tab=readme-ov-file#api).",
    },
    { status: 405 },
  )
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Méthode PUT non supportée. Utilisez POST pour envoyer un fichier CSV.",
    },
    { status: 405 },
  )
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Méthode DELETE non supportée. Utilisez POST pour envoyer un fichier CSV.",
    },
    { status: 405 },
  )
}
