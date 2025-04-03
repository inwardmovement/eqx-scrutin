"use client"

import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) return

    setIsLoading(true)

    const formData = new FormData()
    formData.append("document", file)

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        // Get the response data
        const responseData = await response.json()

        // Encode the data to pass in URL
        const encodedData = encodeURIComponent(JSON.stringify(responseData))

        // Redirect to the results page with data
        router.push(`/result?data=${encodedData}`)
      } else {
        console.error("Error processing file")
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <Card className="w-full max-w-md border-[#ffd412]">
        <CardHeader className="flex flex-col items-center">
          <Image
            src="https://parti-equinoxe.fr/wp-content/uploads/2023/07/LOGO_EQUINOXE_JAUNE-130x61.png.webp"
            alt="Logo Equinoxe"
            width={130}
            height={61}
            className="mb-4"
          />
          <CardTitle className="text-2xl text-[#ffd412]">Scrutin</CardTitle>
          <CardDescription className="text-center">
            Téléversez un document CSV contenant les votes au format suivant (pas de limite de choix) :
          </CardDescription>
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md w-full mt-2 overflow-auto">
            <pre className="text-xs">
              <code>
                Choix A,Choix B,Choix C{"\n"}
                Bien,Passable,Bien{"\n"}
                Très bien,Très bien,Insuffisant{"\n"}
                Bien,Assez bien,Bien
              </code>
            </pre>
          </div>
          <CardDescription className="text-center mt-2">
            L'analyse sera faite avec la méthode du{" "}
            <Link
              href="https://fr.wikipedia.org/wiki/Jugement_usuel"
              target="_blank"
              className="text-[#ffd412] hover:underline"
            >
              Jugement usuel
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-2">
                <label htmlFor="document" className="text-sm font-medium leading-none">
                  Document
                </label>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="document"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 border-[#ffd412]"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg
                        className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 16"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{file ? file.name : "Fichier CSV"}</p>
                    </div>
                    <input
                      id="document"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-[#ffd412] hover:bg-[#e6c010] text-black"
              disabled={!file || isLoading}
            >
              {isLoading ? "Traitement en cours..." : "Analyser"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

