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

      // Ordre des mentions pour calculer la médiane
      const mentionOrder = [
        "À rejeter",
        "Insuffisant",
        "Passable",
        "Bien",
        "Excellent",
      ]

      // Fonction pour trouver la mention médiane
      function findMedianMention(distribution: {
        [key: string]: number
      }): string {
        const totalVotes = Object.values(distribution).reduce(
          (a, b) => a + b,
          0,
        )
        const medianPosition = Math.ceil(totalVotes / 2)
        let cumSum = 0

        for (const mention of mentionOrder) {
          cumSum += distribution[mention]
          if (cumSum >= medianPosition) {
            return mention
          }
        }

        return "Passable" // Fallback si pas de votes
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

        // Determine the median mention
        const dominantMention = findMedianMention(mentionCounts[choice])

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
