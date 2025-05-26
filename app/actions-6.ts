"use server"

import Papa from "papaparse"

export async function processDocument(formData: FormData) {
  try {
    const document = formData.get("document") as File

    if (!document) {
      throw new Error("No document provided")
    }

    let fileContent = ""
    try {
      const arrayBuffer = await document.arrayBuffer()
      const decoder = new TextDecoder("utf-8")
      fileContent = decoder.decode(arrayBuffer)

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

      // Nettoyer les choix
      const choices = lines[0].filter(choice => choice.length > 0)

      if (choices.length === 0) {
        throw new Error("L'en-tête ne contient aucun choix valide")
      }

      const distribution: { [key: string]: any } = {}
      const mentionCounts: { [key: string]: { [mention: string]: number } } = {}

      choices.forEach(choice => {
        mentionCounts[choice] = {
          "Très bien": 0,
          Bien: 0,
          "Assez bien": 0,
          Passable: 0,
          Insuffisant: 0,
          "À rejeter": 0,
        }
      })

      const mentionOrder = [
        "À rejeter",
        "Insuffisant",
        "Passable",
        "Assez bien",
        "Bien",
        "Très bien",
      ]

      // Vérification que toutes les mentions sont valides
      const validMentions = new Set(mentionOrder)

      function findMajorityMention(distribution: {
        [key: string]: number
      }): string {
        const totalVotes = Object.values(distribution).reduce(
          (a, b) => a + b,
          0,
        )
        const majorityPosition =
          totalVotes % 2 === 0 ? totalVotes / 2 : Math.floor(totalVotes / 2) + 1

        for (const mention of mentionOrder) {
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

          if (
            votesSupOrEqual > totalVotes / 2 &&
            votesInfOrEqual >= totalVotes / 2
          ) {
            return mention
          }
        }

        return "Passable"
      }

      for (let i = 1; i < lines.length; i++) {
        const votes = lines[i]

        if (votes.length !== choices.length) {
          throw new Error(
            `Ligne ${i + 1} invalide: nombre de votes incorrect (${votes.length} au lieu de ${choices.length})`,
          )
        }

        votes.forEach((vote, index) => {
          const voteToUse = vote.length === 0 ? "Passable" : vote

          if (!validMentions.has(voteToUse)) {
            throw new Error(
              `Vote invalide à la ligne ${i + 1}: "${voteToUse}" pour "${choices[index]}"\nMentions valides: ${Array.from(validMentions).join(", ")}`,
            )
          }
          mentionCounts[choices[index]][voteToUse]++
        })
      }

      let bestScore = -1
      let winner = ""
      let winningMention = ""

      choices.forEach(choice => {
        const totalVotes = Object.values(mentionCounts[choice]).reduce(
          (a, b) => a + b,
          0,
        )

        const dominantMention = findMajorityMention(mentionCounts[choice])
        const dominantMentionIndex = mentionOrder.indexOf(dominantMention)

        let partisans = 0
        for (let i = dominantMentionIndex + 1; i < mentionOrder.length; i++) {
          partisans += mentionCounts[choice][mentionOrder[i]]
        }
        const Pc = partisans / totalVotes

        let opposants = 0
        for (let i = 0; i < dominantMentionIndex; i++) {
          opposants += mentionCounts[choice][mentionOrder[i]]
        }
        const Oc = opposants / totalVotes

        const score = dominantMentionIndex + 0.5 * ((Pc - Oc) / (1 - Pc - Oc))

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
      if (error instanceof Error) {
        console.error("Erreur détaillée:", error.message)
        throw new Error(
          `Erreur lors du traitement du fichier: ${error.message}`,
        )
      }
      throw error
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return {
      success: false,
      error: "Erreur inconnue lors du traitement du fichier",
    }
  }
}
