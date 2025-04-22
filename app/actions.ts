"use server"

export async function processDocument(formData: FormData) {
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

      // Parse CSV content
      const lines = fileContent.split(/\r?\n/).filter(line => line.trim())
      if (lines.length < 2) {
        throw new Error(
          "Le fichier CSV doit contenir au moins un en-tête et une ligne de données",
        )
      }

      // Get choices from header
      const choices = lines[0].split(",").map(choice => choice.trim())

      // Initialize distribution data
      const distribution: { [key: string]: any } = {}
      const mentionCounts: { [key: string]: { [mention: string]: number } } = {}

      // Initialize counts for each choice
      choices.forEach(choice => {
        mentionCounts[choice] = {
          Excellent: 0,
          Bien: 0,
          Passable: 0,
          Insuffisant: 0,
          "À rejeter": 0,
        }
      })

      // Ordre des mentions du plus faible au plus fort
      const mentionOrder = [
        "À rejeter",
        "Insuffisant",
        "Passable",
        "Bien",
        "Excellent",
      ]

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
        const votes = lines[i].split(",").map(vote => vote.trim())
        if (votes.length !== choices.length) {
          console.error(`Ligne ${i + 1} invalide: nombre de votes incorrect`)
          continue
        }
        votes.forEach((vote, index) => {
          if (mentionCounts[choices[index]][vote] !== undefined) {
            mentionCounts[choices[index]][vote]++
          }
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
    return { success: false, error: "Error processing document" }
  }
}
