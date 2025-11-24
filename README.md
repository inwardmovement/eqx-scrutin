# Fonctionnalités

- Analyse des votes au [jugement médian](https://fr.wikipedia.org/wiki/Jugement_usuel)
- Gestion de l'abstention avec la mention "Abstention"
- Critère de validation
- Taux de participation
- Copie du résultat au format lien, texte ou code

<img width="1948" height="1158" alt="image" src="https://github.com/user-attachments/assets/eee2fad6-d28b-4cbb-a8cc-463667997706" />

# API

<img width="1742" height="973" alt="image" src="https://github.com/user-attachments/assets/26acc87f-c284-46bb-bfa4-88922d91bfd2" />

```
<?php
function analyserCSV($filePath) {
    // Vérifier que le fichier existe
    if (!file_exists($filePath)) {
        throw new Exception("Le fichier n'existe pas: " . $filePath);
    }

    // Vérifier l'extension
    if (!str_ends_with(strtolower($filePath), '.csv')) {
        throw new Exception("Le fichier doit être au format CSV");
    }

    // Vérifier la taille (10MB max)
    $fileSize = filesize($filePath);
    if ($fileSize > 10 * 1024 * 1024) {
        throw new Exception("Le fichier est trop volumineux (max 10MB)");
    }

    // Préparer la requête cURL
    $ch = curl_init();

    // Créer le multipart form data
    $postData = [
        'file' => new CURLFile($filePath, 'text/csv', basename($filePath))
    ];

    curl_setopt_array($ch, [
        CURLOPT_URL => 'https://eqx-scrutin.vercel.app/api',
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postData,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'User-Agent: PHP-Client/1.0'
        ]
    ]);

    // Exécuter la requête
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_error($ch)) {
        throw new Exception("Erreur cURL: " . curl_error($ch));
    }

    curl_close($ch);

    // Vérifier le code de statut HTTP
    if ($httpCode !== 200) {
        throw new Exception("Erreur HTTP: " . $httpCode);
    }

    // Parser la réponse JSON
    $data = json_decode($response, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Erreur de parsing JSON: " . json_last_error_msg());
    }

    if (!$data['success']) {
        throw new Exception("Erreur API: " . $data['error']);
    }

    return $data['result'];
}

// Utilisation
try {
    $resultUrl = analyserCSV('/chemin/vers/fichier.csv');
    echo "Résultat disponible: " . $resultUrl;

    // Rediriger vers le résultat
    header('Location: ' . $resultUrl);
    exit;

} catch (Exception $e) {
    echo "Erreur: " . $e->getMessage();
}
?>
```

# Développement

- `pnpm i` pour installer les dépendances puis `npm run dev` pour développer en local.
- Recommandation d'utiliser [Cursor](https://www.cursor.com/).
