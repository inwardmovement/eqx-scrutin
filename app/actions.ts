"use server"

import Papa from "papaparse"

export type Distribution = {
  [mention: string]: number
}

export type Choice = {
  mention: string
  score: string
  distribution: Distribution
  tieBreakScore?: string
  rank?: number
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

      // Détection du format "une valeur par ligne" (sans virgule ni point-virgule)
      // ex. : première ligne = nom de la proposition, lignes suivantes = une mention par ligne
      const hasCsvDelimiter = /[,;\t]/.test(fileContent)
      const singleColumnDelimiter = fileContent.includes("|") ? "\x01" : "|"

      const parseResult = Papa.parse(fileContent, {
        delimiter: hasCsvDelimiter ? undefined : singleColumnDelimiter,
        skipEmptyLines: true,
        transformHeader: header => header.trim(),
        transform: value => value.trim(),
        comments: "#",
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

      // Construire l'ensemble des mentions sur toutes les lignes de votes
      const allMentions = new Set<string>()
      for (let i = 1; i < lines.length; i++) {
        for (const mention of lines[i]) {
          allMentions.add(mention)
        }
      }

      // Vérifier si l'abstention est présente
      const hasAbstention = allMentions.has("Abstention")

      // Détecter automatiquement le format basé sur les mentions présentes
      // Si "Très bien" ou "Assez bien" sont présents, c'est le format 6 mentions
      // Sinon, c'est le format 5 mentions (avec "Excellent")
      const hasVersion6Mentions =
        allMentions.has("Très bien") || allMentions.has("Assez bien")
      const hasVersion5Mentions = allMentions.has("Excellent")

      // Utiliser l'option fournie par défaut, mais détecter automatiquement si possible
      let isVersion6 = formData.get("isVersion6") === "true"

      // Détection automatique : si on trouve des mentions spécifiques à un format, l'utiliser
      if (hasVersion6Mentions && !hasVersion5Mentions) {
        isVersion6 = true
      } else if (hasVersion5Mentions && !hasVersion6Mentions) {
        isVersion6 = false
      }
      // Si les deux sont présents ou aucun, on utilise l'option fournie par défaut

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
          ...(hasAbstention ? { Abstention: 0 } : {}),
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
      if (hasAbstention) {
        validMentions.add("Abstention")
      }

      // Fonction pour trouver la mention majoritaire selon la définition du jugement majoritaire
      function findMajorityMention(distribution: {
        [key: string]: number
      }): string {
        // Exclure les abstentions du calcul du total de votes
        const totalVotes = Object.entries(distribution)
          .filter(([mention]) => mention !== "Abstention")
          .reduce((a, [, b]) => a + b, 0)

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

      // Calculate distribution and recursive scores for each choice
      const candidatesData: any[] = []

      function calcScore(mcIndex: number, p: number, q: number) {
        const denominator = 1 - p - q
        return denominator !== 0
          ? mcIndex + 0.5 * ((p - q) / denominator)
          : mcIndex
      }

      choices.forEach(choice => {
        // Calculer le nombre total de votes pour ce choix (exclure les abstentions)
        const totalVotes = Object.entries(mentionCounts[choice])
          .filter(([mention]) => mention !== "Abstention")
          .reduce((a, [, b]) => a + b, 0)

        // Déterminer la mention majoritaire (en excluant les abstentions)
        const distributionWithoutAbstention = { ...mentionCounts[choice] }
        if (hasAbstention) {
          delete distributionWithoutAbstention["Abstention"]
        }
        const dominantMention = findMajorityMention(
          distributionWithoutAbstention,
        )
        const dominantMentionIndex = mentionOrder.indexOf(dominantMention)

        // Calcul récursif pour le départage
        const nMax = mentionOrder.length
        const scores: number[] = []
        const vectors: number[] = []

        for (let n = 1; n < nMax; n++) {
          let partisans = 0
          for (let i = dominantMentionIndex + n; i < mentionOrder.length; i++) {
            partisans += mentionCounts[choice][mentionOrder[i]] || 0
          }
          const p_n = totalVotes > 0 ? partisans / totalVotes : 0

          let opposants = 0
          for (let i = 0; i <= dominantMentionIndex - n; i++) {
            opposants += mentionCounts[choice][mentionOrder[i]] || 0
          }
          const q_n = totalVotes > 0 ? opposants / totalVotes : 0

          scores.push(calcScore(dominantMentionIndex, p_n, q_n))
          vectors.push(-q_n)
          vectors.push(p_n)
        }

        candidatesData.push({
          choice,
          dominantMention,
          baseScore: scores[0],
          scores,
          vectors,
          tieBreakDepth: 0,
        })
      })

      // Trier les candidats pour déterminer le vainqueur (ordre décroissant)
      candidatesData.sort((a, b) => {
        // 1. Comparer les scores récursivement
        for (let i = 0; i < Math.max(a.scores.length, b.scores.length); i++) {
          const scoreA = a.scores[i] || 0
          const scoreB = b.scores[i] || 0
          if (Math.abs(scoreB - scoreA) > 1e-9) {
            return scoreB - scoreA
          }
        }
        // 2. Si tous les scores sont égaux, comparer le vecteur lexicographique (-q^n, p^n)
        for (let i = 0; i < Math.max(a.vectors.length, b.vectors.length); i++) {
          const vecA = a.vectors[i] || 0
          const vecB = b.vectors[i] || 0
          if (Math.abs(vecB - vecA) > 1e-9) {
            return vecB - vecA
          }
        }
        return 0 // Égalité parfaite
      })

      const winner = candidatesData.length > 0 ? candidatesData[0].choice : ""
      const winningMention =
        candidatesData.length > 0 ? candidatesData[0].dominantMention : ""

      // Calculer le tieBreakDepth pour chaque groupe d'égalité
      let groupStart = 0;
      while (groupStart < candidatesData.length) {
        let groupEnd = groupStart + 1;
        while (
          groupEnd < candidatesData.length &&
          Math.abs(candidatesData[groupEnd].baseScore - candidatesData[groupStart].baseScore) < 1e-9 &&
          candidatesData[groupEnd].dominantMention === candidatesData[groupStart].dominantMention
        ) {
          groupEnd++;
        }
        
        if (groupEnd - groupStart > 1) {
          let maxDepthForGroup = 0;
          for (let i = groupStart; i < groupEnd - 1; i++) {
            const a = candidatesData[i]
            const b = candidatesData[i+1]
            let depth = 0
            for (let d = 1; d < Math.max(a.scores.length, b.scores.length); d++) {
              if (Math.abs((a.scores[d] || 0) - (b.scores[d] || 0)) > 1e-9 ||
                  Math.abs((a.vectors[(d-1)*2] || 0) - (b.vectors[(d-1)*2] || 0)) > 1e-9 ||
                  Math.abs((a.vectors[(d-1)*2+1] || 0) - (b.vectors[(d-1)*2+1] || 0)) > 1e-9) {
                depth = d;
                break;
              }
            }
            maxDepthForGroup = Math.max(maxDepthForGroup, depth);
          }
          
          for (let i = groupStart; i < groupEnd; i++) {
            candidatesData[i].tieBreakDepth = maxDepthForGroup;
          }
        }
        groupStart = groupEnd;
      }

      // Préparer la distribution finale en conservant l'ordre original du CSV.
      // Le rang reste issu du classement calculé pour permettre le tri optionnel côté UI.
      const candidatesByChoice = new Map(
        candidatesData.map((candidate, index) => [
          candidate.choice,
          {
            ...candidate,
            rank: index + 1,
          },
        ]),
      )

      choices.forEach(choice => {
        const candidate = candidatesByChoice.get(choice)
        if (!candidate) {
          return
        }

        let tieBreakScore: string | undefined = undefined
        if (
          candidate.tieBreakDepth &&
          candidate.tieBreakDepth > 0 &&
          candidate.tieBreakDepth < candidate.scores.length
        ) {
          tieBreakScore = candidate.scores[candidate.tieBreakDepth].toFixed(2)
        }

        distribution[choice] = {
          mention: candidate.dominantMention,
          score: candidate.baseScore.toFixed(2),
          ...(tieBreakScore ? { tieBreakScore } : {}),
          rank: candidate.rank,
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
