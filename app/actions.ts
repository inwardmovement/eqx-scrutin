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
        // Generate random score between 0 and 5 with 2 decimal places
        const score = (Math.random() * 5).toFixed(2)
        const scoreNum = parseFloat(score)

        // Determine the majority mention
        const dominantMention = findMajorityMention(mentionCounts[choice])

        // Update winner if this score is higher
        if (scoreNum > bestScore) {
          bestScore = scoreNum
          winner = choice
          winningMention = dominantMention
        }

        distribution[choice] = {
          mention: dominantMention,
          score: score,
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
