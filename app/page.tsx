"use client"
import Image from "next/image"
import { useState, useEffect, useLayoutEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

function HomeContent() {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // S'assurer que le composant est monté
  useLayoutEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Gérer les erreurs via les paramètres d'URL
  useEffect(() => {
    if (!isMounted) return

    const error = searchParams.get("error")
    if (error === "no_result") {
      toast.error("Aucun résultat disponible", {
        description: "Téléverser un fichier à analyser",
      })
    } else if (error === "invalid_data") {
      toast.error("Erreur de données", {
        description: "Format de données invalide",
      })
    }
  }, [searchParams, isMounted])

  // Automatically submit the form when a file is selected
  useEffect(() => {
    if (file && !isLoading) {
      handleSubmit()
    }
  }, [file])

  const handleSubmit = async () => {
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
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LOGO_EQUINOXE_JAUNE-300x141.png-dQx5qJhppS2T2s3JctMaUuCNlyYAEA.webp"
            alt="Logo Equinoxe"
            width={200}
            height={94}
            className="mb-4"
          />
          <CardTitle className="text-2xl">Scrutin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-2">
              <label
                htmlFor="document"
                className="text-sm font-medium leading-none sr-only">
                {isLoading ? "Traitement en cours..." : ""}
              </label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="document"
                  className={`group flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 ${
                    isLoading ? "opacity-50 pointer-events-none" : ""
                  }`}>
                  <div className="flex flex-col items-center justify-center p-5">
                    {isLoading ? (
                      <svg
                        className="animate-spin mr-3 h-5 w-5 text-gray-900 dark:text-gray-100"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <>
                        <svg
                          className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 20 16">
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                          />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                          Sélectionner un fichier CSV au format suivant
                        </p>
                        <div className="bg-gray-100 dark:bg-gray-700 dark:group-hover:bg-gray-800 p-3 rounded-md w-full mt-2 mb-2 overflow-auto">
                          <pre className="text-xs">
                            <code>
                              Choix A,Choix B,Choix C,...{"\n"}
                              Bien,Passable,Excellent,...{"\n"}
                              Très bien,Bien,À rejeter,...{"\n"}
                              Passable,Bien,Excellent,...{"\n"}
                              ...
                            </code>
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    id="document"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    disabled={isLoading}
                  />
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-col items-center">
              <div className="animate-pulse h-24 w-48 bg-gray-200 rounded mb-4"></div>
              <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse h-64 w-full bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        </main>
      }>
      <HomeContent />
    </Suspense>
  )
}
