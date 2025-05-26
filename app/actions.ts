"use server"

import Papa from "papaparse"

export type Distribution = {
  [mention: string]: number
}

export type Choice = {
  mention: string
  score: string
  distribution: Distribution
}

export type ScrutinData = {
  distribution: {
    [choice: string]: Choice
  }
  winner: string
  winningMention: string
  details: { [key: string]: string }
}

export type ProcessDocumentResponse = {
  success: boolean
  data?: ScrutinData
  error?: string
}

export async function processDocument(
  formData: FormData,
): Promise<ProcessDocumentResponse> {
  try {
    const document = formData.get("document") as File

    if (!document) {
      throw new Error("No document provided")
    }

    // Log document content
    console.log("Document received:", document.name)
    console.log("Document size:", document.size, "bytes")
    console.log("Document type:", document.type)

    // Read the file content (for text files)
    let fileContent = ""
    try {
      const arrayBuffer = await document.arrayBuffer()
      const decoder = new TextDecoder("utf-8")
      fileContent = decoder.decode(arrayBuffer)
      console.log("File content:", fileContent)

      // Parse CSV content using PapaParse
      const parseResult = Papa.parse(fileContent, {
        skipEmptyLines: true,
        transformHeader: header => header.trim(),
        transform: value => value.trim(),
      })

      if (parseResult.errors.length > 0) {
        throw new Error(parseResult.errors[0].message)
      }

      const lines = parseResult.data as string[][]
      if (lines.length < 2) {
        throw new Error(
          "Le fichier CSV doit contenir au moins un en-tête et une ligne de données",
        )
      }

      // Get choices from header
      const choices = lines[0]

      // Vérifier le format du fichier (5 ou 6 mentions)
      const isVersion6 = formData.get("isVersion6") === "true"

      // Construire l'ensemble des mentions sur toutes les lignes de votes
      const allMentions = new Set<string>()
      for (let i = 1; i < lines.length; i++) {
        for (const mention of lines[i]) {
          allMentions.add(mention)
        }
      }
      const mentionCount = allMentions.size

      // Vérifier la cohérence entre le format du fichier et l'option sélectionnée
      if (mentionCount === 6 && !isVersion6) {
        return {
          success: false,
          error:
            "Ce fichier utilise le format à 6 mentions : cocher la case correspondante.",
        }
      }
      if (mentionCount === 5 && isVersion6) {
        return {
          success: false,
          error:
            'Ce fichier utilise le format à 5 mentions : décocher la case "Version 6 mentions".',
        }
      }
      if (mentionCount !== 5 && mentionCount !== 6) {
        return {
          success: false,
          error: `Format de fichier invalide : ${mentionCount} mentions trouvées. Le fichier doit contenir exactement 5 ou 6 mentions.`,
        }
      }

      // Initialize distribution data
      const distribution: { [key: string]: any } = {}
      const mentionCounts: { [key: string]: { [mention: string]: number } } = {}

      // Initialize counts for each choice
      choices.forEach(choice => {
        mentionCounts[choice] = {
          "À rejeter": 0,
          Insuffisant: 0,
          Passable: 0,
          Bien: 0,
          ...(isVersion6
            ? { "Assez bien": 0, "Très bien": 0 }
            : { Excellent: 0 }),
        }
      })

      // Ordre des mentions du plus faible au plus fort
      const mentionOrder = isVersion6
        ? [
            "À rejeter",
            "Insuffisant",
            "Passable",
            "Bien",
            "Assez bien",
            "Très bien",
          ]
        : ["À rejeter", "Insuffisant", "Passable", "Bien", "Excellent"]

      // Vérification que toutes les mentions sont valides
      const validMentions = new Set(mentionOrder)

      // Fonction pour trouver la mention majoritaire selon la définition du jugement majoritaire
      function findMajorityMention(distribution: {
        [key: string]: number
      }): string {
        const totalVotes = Object.values(distribution).reduce(
          (a, b) => a + b,
          0,
        )

        // Position de la mention majoritaire selon le nombre de votants
        const majorityPosition =
          totalVotes % 2 === 0 ? totalVotes / 2 : Math.floor(totalVotes / 2) + 1

        // Pour chaque mention possible
        for (const mention of mentionOrder) {
          // Compter les votes pour les mentions supérieures ou égales
          let votesSupOrEqual = 0
          let votesInfOrEqual = 0

          for (const m of mentionOrder) {
            const index = mentionOrder.indexOf(m)
            const currentIndex = mentionOrder.indexOf(mention)

            if (index >= currentIndex) {
              votesSupOrEqual += distribution[m]
            }
            if (index <= currentIndex) {
              votesInfOrEqual += distribution[m]
            }
          }

          // Vérifier les conditions de la mention majoritaire :
          // 1. Majorité absolue contre toute mention inférieure (> 50%)
          // 2. Majorité absolue ou égalité contre toute mention supérieure (>= 50%)
          if (
            votesSupOrEqual > totalVotes / 2 &&
            votesInfOrEqual >= totalVotes / 2
          ) {
            return mention
          }
        }

        return "Passable" // Fallback si aucune mention ne satisfait les conditions
      }

      // Count mentions for each choice
      for (let i = 1; i < lines.length; i++) {
        const votes = lines[i]
        if (votes.length !== choices.length) {
          throw new Error(
            `Ligne ${i + 1} invalide: nombre de votes incorrect (${votes.length} au lieu de ${choices.length})`,
          )
        }
        votes.forEach((vote, index) => {
          if (!validMentions.has(vote)) {
            throw new Error(
              `Vote invalide à la ligne ${i + 1}: "${vote}" pour "${choices[index]}"\nMentions valides: ${Array.from(validMentions).join(", ")}`,
            )
          }
          mentionCounts[choices[index]][vote]++
        })
      }

      // Calculate distribution and random scores for each choice
      let bestScore = -1
      let winner = ""
      let winningMention = ""

      choices.forEach(choice => {
        // Calculer le nombre total de votes pour ce choix
        const totalVotes = Object.values(mentionCounts[choice]).reduce(
          (a, b) => a + b,
          0,
        )

        // Déterminer la mention majoritaire
        const dominantMention = findMajorityMention(mentionCounts[choice])
        const dominantMentionIndex = mentionOrder.indexOf(dominantMention)

        // Calculer Pc (partisans) - somme des votes strictement supérieurs à la mention majoritaire
        let partisans = 0
        for (let i = dominantMentionIndex + 1; i < mentionOrder.length; i++) {
          partisans += mentionCounts[choice][mentionOrder[i]]
        }
        const Pc = partisans / totalVotes

        // Calculer Oc (opposants) - somme des votes strictement inférieurs à la mention majoritaire
        let opposants = 0
        for (let i = 0; i < dominantMentionIndex; i++) {
          opposants += mentionCounts[choice][mentionOrder[i]]
        }
        const Oc = opposants / totalVotes

        // Calculer le score selon la formule : Mc + 0.5 * ((Pc - Oc)/(1 - Pc - Oc))
        const score = dominantMentionIndex + 0.5 * ((Pc - Oc) / (1 - Pc - Oc))

        // Mettre à jour le gagnant si ce score est plus élevé
        if (score > bestScore) {
          bestScore = score
          winner = choice
          winningMention = dominantMention
        }

        distribution[choice] = {
          mention: dominantMention,
          score: score.toFixed(2),
          distribution: mentionCounts[choice],
        }
      })

      // Create the response data
      const responseData = {
        distribution,
        winner,
        winningMention,
        details: {
          "Méthode de calcul": "Jugement usuel",
          "Nombre de votants": (lines.length - 1).toString(),
        },
      }

      return { success: true, data: responseData }
    } catch (error) {
      console.error("Error reading file content:", error)
      throw error
    }
  } catch (error) {
    console.error("Error processing document:", error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return {
      success: false,
      error: "Erreur inconnue lors du traitement du fichier",
    }
  }
}
