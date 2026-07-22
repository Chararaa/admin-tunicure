// verify.js
const fs = require("fs");
const path = require("path");

console.log("🔍 VÉRIFICATION DU PROJET\n");

// 1. Vérifier la structure
console.log("📁 STRUCTURE DU PROJET :");
const projectRoot = __dirname;

const checkDir = (dirPath, name) => {
  const exists = fs.existsSync(dirPath);
  console.log(
    `   ${exists ? "✅" : "❌"} ${name}: ${exists ? "Trouvé" : "Manquant"}`
  );
  return exists;
};

checkDir(path.join(projectRoot, "backend"), "backend/");
checkDir(path.join(projectRoot, "backend/credentials"), "backend/credentials/");

// 2. Vérifier le fichier credentials
const credentialsPath = path.join(
  projectRoot,
  "backend/credentials/dialogflow-key.json"
);
console.log(`\n🔑 FICHIER CREDENTIALS : ${credentialsPath}`);

if (fs.existsSync(credentialsPath)) {
  console.log("✅ Fichier trouvé");

  try {
    const content = fs.readFileSync(credentialsPath, "utf8");
    const credentials = JSON.parse(content);

    console.log("\n📋 INFORMATIONS :");
    console.log(`   Project ID: ${credentials.project_id}`);
    console.log(`   Client Email: ${credentials.client_email}`);
    console.log(`   Key ID: ${credentials.private_key_id.substring(0, 8)}...`);

    console.log("\n🎉 TOUT EST BON ! Prêt pour l'installation.");
  } catch (error) {
    console.error("❌ Erreur de lecture JSON:", error.message);
  }
} else {
  console.error("❌ Fichier non trouvé");

  // Lister les fichiers dans credentials
  const credsDir = path.join(projectRoot, "backend/credentials");
  if (fs.existsSync(credsDir)) {
    console.log("\n📄 Fichiers dans credentials/:");
    const files = fs.readdirSync(credsDir);
    files.forEach((file) => {
      const fullPath = path.join(credsDir, file);
      const stats = fs.statSync(fullPath);
      console.log(
        `   - ${file} (${stats.isDirectory() ? "dossier" : "fichier"})`
      );
    });
  }
}
