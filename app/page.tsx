"use client"
import Image from "next/image"
import { useState, useEffect, useLayoutEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import Logo from "@/public/logo-eqx.webp"

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
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error:", error)
      setIsLoading(false)
    }
  }

  // Gérer la fin du chargement après la navigation
  useEffect(() => {
    return () => {
      setIsLoading(false)
    }
  }, [])

  return (
    <main className="mt-16 flex flex-col items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <Image
            src={Logo}
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
                className="sr-only text-sm font-medium leading-none">
                {isLoading ? "Traitement en cours..." : ""}
              </label>
              <div className="flex w-full items-center justify-center">
                <label
                  htmlFor="document"
                  className={`group flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-gray-100 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500 dark:hover:bg-gray-700 ${
                    isLoading ? "pointer-events-none opacity-50" : ""
                  }`}>
                  <div className="flex flex-col items-center justify-center p-5">
                    {isLoading ? (
                      <Spinner className="size-5" />
                    ) : (
                      <>
                        <svg
                          className="mb-3 h-8 w-8 text-gray-500 dark:text-gray-400"
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
                        <p className="mb-2 text-center text-sm text-gray-500 dark:text-gray-400">
                          Sélectionner un fichier CSV au format suivant
                        </p>
                        <div className="mb-2 mt-2 w-full overflow-auto rounded-md bg-gray-100 p-3 dark:bg-gray-700 dark:group-hover:bg-gray-800">
                          <pre className="text-xs">
                            <code className="text-xs">
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
              <div className="mb-4 h-24 w-48 animate-pulse rounded bg-gray-200"></div>
              <div className="h-8 w-24 animate-pulse rounded bg-gray-200"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full animate-pulse rounded bg-gray-200"></div>
            </CardContent>
          </Card>
        </main>
      }>
      <HomeContent />
    </Suspense>
  )
}
