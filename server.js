import express from 'express';
import path from 'path';
import pkg from 'pg';
const { Client, Pool } = pkg;
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import xml2js from 'xml2js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'flux_rss',
  password: '8ULMJvhsO6DrTWbX6UVK', 
  port: 5432,
});

const db = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'flux_rss',
  password: '8ULMJvhsO6DrTWbX6UVK', 
  port: 5432,
});

db.connect(err => {
  if (err) console.error('Erreur de connexion à PostgreSQL', err.stack);
  else console.log('Connecté à PostgreSQL!');
});

const app = express();
const PORT = 3000;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.get('/articles/:category', async (req, res) => {
  const category = req.params.category;
  
  try {

    const result = await db.query('SELECT * FROM articles WHERE category = $1', [category]);
    const articles = result.rows;


    if (articles.length === 0) {
      return res.send('Aucun article trouvé pour cette catégorie');
    }

    res.render('articles', {
      category: category,
      articles: articles,  
    });

  } catch (err) {
    console.error('Erreur lors de la récupération des articles:', err);
    res.status(500).send('Impossible de récupérer les articles');
  }
});


app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.post('/api/rating', (req, res) => {
  const { id, category } = req.body;
  console.log(`Article ID: ${id}, Category: ${category}`);

 

  res.status(200).send('Catégorie mise à jour');
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});


const urls = [
  "https://www.zdnet.fr/feed",
  "https://siecledigital.fr/cybersecurite/feed/",
  "https://lesnews.ca/tech/feed/",
  "https://cyber.gouv.fr/actualites/feed",
  "https://www.challenges.fr/entreprise/media/rss.xml",
  "https://www.zataz.com/feed/",
  "https://www.lemondeinformatique.fr/flux-rss/thematique/securite/rss.xml",
  "https://www.info.gouv.fr/rss/actualites.xml",
  "https://www.usine-digitale.fr/rss",
  "https://www.cert.ssi.gouv.fr/feed/",
];


async function parseRss(body) {
  try {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(body);
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'analyse du flux RSS:', error.message);
    return null;
  }
}


app.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM articles ORDER BY pub_date DESC'); // Tri par date
        const articles = result.rows;

        res.json(articles);
    } catch (err) {
        console.error('Erreur lors de la récupération des articles:', err);
        res.status(500).json({ error: 'Impossible de récupérer les articles' });
    }
});



app.delete('/articles/delete/:id', async (req, res) => {
  const articleId = req.params.id;

  try {
   
    const result = await db.query('DELETE FROM articles WHERE id = $1', [articleId]);

    if (result.rowCount > 0) {
      res.status(200).json({ message: 'Article supprimé avec succès' });
    } else {
      res.status(404).json({ message: 'Article introuvable' });
    }
  } catch (err) {
    console.error('Erreur lors de la suppression de l\'article :', err);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'article' });
  }
});


async function filterRssByCybersecurity(url, parsed) {
  const cyberKeywords = [
      'cyber', 'sécurité', 'vulnérabilité', 'hacking', 'malware', 'ransomware',
      'phishing', 'fuite de données', 'attaque', 'cyberattaque', 'cryptage', 'chiffrement',
      'piratage', 'exploit', 'zero-day', 'intrusion', 'firewall', 'botnet', 'sécurisation',
      'protection', 'identité numérique', 'authentification', 'cryptomonnaie', 'vol de données',
      'risque', 'incident de sécurité', 'fuite', 'spyware', 'keylogger', 'réseau privé virtuel',
      'VPN', 'audit de sécurité', 'doxxing', 'fraude numérique', 'cybercriminalité', 'pirate informatique',
      'détection d\'intrusion', 'protection des données', 'sécurité des applications', 'menace persistante avancée',
      'APT', 'intrusion réseau', 'fuite d\'informations', 'authentification à deux facteurs', 'contrôle d\'accès',
      'cyberdéfense'
  ];

  const items = parsed.rss.channel[0].item || [];

  return items.map(item => {
      const description = item.description ? item.description[0] : '';
      const pubdate = item.pubDate ? new Date(item.pubDate[0]) : null; 

      if (url.includes("info.gouv.fr") || url.includes("cyber.gouv.fr")) {
          return {
              title: item.title[0],
              link: item.link[0],
              description: '', 
              pubdate: pubdate, 
          };
      }

      const title = item.title[0].toLowerCase();
      const lowerDescription = description.toLowerCase();

      if (cyberKeywords.some(keyword => title.includes(keyword) || lowerDescription.includes(keyword))) {
          return {
              title: item.title[0],
              link: item.link[0],
              description: description,
              pubdate: pubdate, 
          };
      }

      return null; 
  }).filter(Boolean); 
}


async function insertArticleToDb({ title, link, description, pubdate }) {
  try {
      const existingArticleQuery = 'SELECT * FROM articles WHERE link = $1';
      const existingArticle = await db.query(existingArticleQuery, [link]);

      if (existingArticle.rows.length > 0) {
          return; 
      }

      const insertQuery = 'INSERT INTO articles(title, link, summary, pub_date) VALUES($1, $2, $3, $4)';
      await db.query(insertQuery, [title, link, description, pubdate]); 

  } catch (err) {
      console.error('Erreur lors de l\'insertion de l\'article dans la base de données:', err);
  }
}


urls.forEach(url => fetchAndInsertRss(url));


async function fetchAndInsertRss(url) {
  if (!url) {
    console.error("L'URL du flux RSS est manquante.");
    return;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.error(`Erreur HTTP lors de la récupération du flux RSS: ${response.statusText}`);
      return;
    }

    const body = await response.text();
    const parsed = await parseRss(body);

    if (parsed && parsed.rss && parsed.rss.channel && parsed.rss.channel[0].item && parsed.rss.channel[0].item.length > 0) {
      

      
      const articles = await filterRssByCybersecurity(url, parsed);
      articles.forEach(article => insertArticleToDb(article));
    } else {
      console.log(`Aucun article trouvé dans le flux: ${url}`);
    }
  } catch (error) {
    console.error(`Erreur lors de la récupération ou de l'insertion des articles depuis ${url}: ${error.message}`);
  }
}
app.get('/api/articles/all', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM articles');
    const articles = result.rows;

  
    res.json(articles);
  } catch (err) {
    console.error('Erreur lors de la récupération des articles:', err);
    res.status(500).json({ error: 'Impossible de récupérer les articles' });
  }
});
app.post('/api/updateCategory/:id', async (req, res) => {
  const articleId = req.params.id;
  const { category } = req.body; 

  try {
     
      const query = 'UPDATE articles SET category = $1 WHERE id = $2';
      await db.query(query, [category, articleId]);

      
      res.json({ message: 'Catégorie mise à jour avec succès' });
  } catch (err) {
      console.error('Erreur lors de la mise à jour de la catégorie:', err);
      res.status(500).json({ error: 'Impossible de mettre à jour la catégorie' });
  }
});

