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
    } catch (error) {
      console.error("Error reading file content:", error)
      // Continue with static data even if file reading fails
    }

    // Create the response data
    const responseData = {
      distribution: {
        "Choix A": {
          mention: "Bien",
          score: "3.48",
          distribution: {
            Excellent: 2,
            Bien: 2,
            Passable: 3,
            Insuffisant: 2,
            "À rejeter": 1,
          },
        },
        "Choix B": {
          mention: "Passable",
          score: "2.17",
          distribution: {
            Excellent: 0,
            Bien: 2,
            Passable: 4,
            Insuffisant: 1,
            "À rejeter": 3,
          },
        },
        "Choix C": {
          mention: "Passable",
          score: "2.68",
          distribution: {
            Excellent: 1,
            Bien: 1,
            Passable: 3,
            Insuffisant: 1,
            "À rejeter": 4,
          },
        },
      },
      winner: "Choix A",
      winningMention: "Bien",
      details: {
        "Méthode de calcul": "Jugement usuel",
        "Nombre de votants": "10",
      },
    }

    return { success: true, data: responseData }
  } catch (error) {
    console.error("Error processing document:", error)
    return { success: false, error: "Error processing document" }
  }
}
