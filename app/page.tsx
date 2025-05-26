"use client"

import Image from "next/image"
import {
  useState,
  useEffect,
  useLayoutEffect,
  Suspense,
  useCallback,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import Logo from "@/public/logo-eqx.webp"
import { processDocument } from "./actions"
import { processDocument as processDocument6 } from "./actions-6"
import Link from "next/link"
import { formatDataForUrl } from "./utils/url-format"
import { formatDataForUrl as formatDataForUrl6 } from "./utils/url-format-6"
import { Checkbox } from "@/components/ui/checkbox"
import type { ScrutinData } from "./actions"

type ResultData = {
  distribution: {
    [choice: string]: {
      mention: string
      score: string
      distribution: {
        [mention: string]: number
      }
    }
  }
  winner?: string
  winningMention?: string
  details?: { [key: string]: string }
}

// Composant séparé pour gérer les paramètres d'URL
function ErrorHandler() {
  const searchParams = useSearchParams()
  const [isMounted, setIsMounted] = useState(false)

  useLayoutEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

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

  return null
}

function HomeContent() {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isVersion6, setIsVersion6] = useState(false)
  const router = useRouter()

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsLoading(true)

      if (!file) {
        toast.error("Aucun fichier sélectionné", {
          description: "Veuillez sélectionner un fichier CSV à analyser",
        })
        setIsLoading(false)
        return
      }

      try {
        const formData = new FormData()
        formData.append("document", file)
        formData.append("isVersion6", isVersion6.toString())

        const result = await (isVersion6
          ? processDocument6(formData)
          : processDocument(formData))
        if (!result.success) {
          const errorMessage = result.error?.toLowerCase() || ""

          // Gestion des erreurs avec des messages plus clairs
          if (
            errorMessage.includes("vote invalide") ||
            errorMessage.includes("mention invalide")
          ) {
            if (isVersion6) {
              toast.error("Format de fichier incompatible", {
                description:
                  'Ce fichier utilise le format à 5 mentions : décocher la case "Version 6 mentions".',
              })
            } else {
              toast.error("Format de fichier incompatible", {
                description:
                  "Ce fichier utilise le format à 6 mentions : cocher la case correspondante.",
              })
            }
          } else {
            toast.error("Erreur lors du traitement du fichier", {
              description: result.error,
            })
          }
          setFile(null)
          setIsLoading(false)
          return
        }

        if (!result.data) {
          toast.error("Erreur lors du traitement du fichier", {
            description: "Aucune donnée n'a été générée",
          })
          setFile(null)
          setIsLoading(false)
          return
        }

        const urlData = isVersion6
          ? formatDataForUrl6(result.data)
          : formatDataForUrl(result.data)
        router.push(`/result${isVersion6 ? "-6" : ""}?data=${urlData}`)
      } catch (err) {
        console.error("Erreur lors du traitement du fichier:", err)
        toast.error("Erreur lors du traitement du fichier", {
          description:
            err instanceof Error
              ? err.message
              : "Une erreur inattendue s'est produite",
        })
        setFile(null)
        setIsLoading(false)
      }
    },
    [file, isVersion6, router],
  )

  // Soumettre le formulaire quand le fichier est collecté
  useEffect(() => {
    if (file && !isLoading) {
      handleSubmit(new Event("submit") as unknown as React.FormEvent)
    }
  }, [file, isLoading, handleSubmit])

  return (
    <main className="flex flex-col items-center p-4 md:mt-8">
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
                  className={`group flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-700 ${
                    isLoading ? "pointer-events-none opacity-50" : ""
                  }`}>
                  <div className="flex flex-col items-center justify-center p-5">
                    {isLoading ? (
                      <Spinner className="size-5" />
                    ) : (
                      <>
                        <svg
                          className="mb-3 h-8 w-8 text-gray-400"
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
                        <p className="mb-2 text-center text-sm text-gray-400">
                          Sélectionner un fichier CSV au format suivant
                        </p>
                        <div className="mb-2 mt-2 w-full overflow-auto rounded-md bg-gray-700 p-3 group-hover:bg-gray-800">
                          <pre className="text-xs">
                            <code className="text-xs">
                              Choix A,Choix B,Choix C...{"\n"}
                              Excellent,Passable,Bien...{"\n"}
                              Insuffisant,Bien,Passable...{"\n"}
                              Excellent,À rejeter,Bien...{"\n"}
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
                    onChange={e => {
                      setFile(e.target.files?.[0] || null)
                      // Réinitialiser la valeur de l'input pour permettre la sélection du même fichier
                      e.target.value = ""
                    }}
                    disabled={isLoading}
                  />
                </label>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start text-xs text-gray-600">
          <ul className="list-disc pl-4">
            <li>
              Mentions : <em>Excellent</em>, <em>Bien</em>, <em>Passable</em>,{" "}
              <em>Insuffisant</em>, <em>À rejeter</em>
            </li>
            <li>
              Résultat calculé au{" "}
              <Link
                href="https://fr.wikipedia.org/wiki/Jugement_usuel"
                target="_blank"
                className="text-blue-600 hover:underline">
                Jugement médian
              </Link>
            </li>
          </ul>
          <div className="flex items-center space-x-2 pt-4">
            <Checkbox
              id="version6"
              className="text-muted-foreground"
              checked={isVersion6}
              onCheckedChange={checked => setIsVersion6(checked === true)}
            />
            <label
              htmlFor="version6"
              className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Version 6 mentions
            </label>
          </div>
        </CardFooter>
      </Card>
    </main>
  )
}

export default function HomePage() {
  return (
    <>
      <Suspense>
        <ErrorHandler />
      </Suspense>
      <HomeContent />
    </>
  )
}
