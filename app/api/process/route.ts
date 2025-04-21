import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const document = formData.get("document") as File

    if (!document) {
      return NextResponse.json(
        { error: "No document provided" },
        { status: 400 },
      )
    }

    // Log document content
    console.log("Document received:", document.name)
    console.log("Document size:", document.size, "bytes")
    console.log("Document type:", document.type)

    // Read the file content (for text files)
    // In a real application, you would process different file types accordingly
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

    // Create the response data as a JSON string
    const responseDataJson = `{
      "distribution": {
        "Choix A": {
          "Excellent": 2, 
          "Très bien": 1, 
          "Bien": 2, 
          "Assez bien": 0, 
          "Passable": 3, 
          "Insuffisant": 2, 
          "À rejeter": 0
        },
        "Choix B": {
          "Excellent": 0, 
          "Très bien": 0, 
          "Bien": 4, 
          "Assez bien": 2, 
          "Passable": 1, 
          "Insuffisant": 2, 
          "À rejeter": 1
        },
        "Choix C": {
          "Excellent": 3, 
          "Très bien": 2, 
          "Bien": 0, 
          "Assez bien": 1, 
          "Passable": 0, 
          "Insuffisant": 1, 
          "À rejeter": 3
        }
      },
      "winner": "Choix B",
      "winningMention": "Bien",
      "details": {
        "detail 1": "lorem ipsum",
        "detail 2": "lorem ipsum",
        "detail 3": "lorem ipsum"
      }
    }`

    // Parse the JSON string back to an object
    const responseData = JSON.parse(responseDataJson)

    // Return the response
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error processing document:", error)
    return NextResponse.json(
      { error: "Error processing document" },
      { status: 500 },
    )
  }
}
