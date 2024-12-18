import { Sequelize } from 'sequelize';

// Configurez la connexion à PostgreSQL avec Sequelize
const sequelize = new Sequelize('postgres://postgres:8ULMJvhsO6DrTWbX6UVK@localhost:5432/flux_rss', {
  dialect: 'postgres',
  logging: false, // Désactive le logging des requêtes SQL dans la console
});

// Vérification de la connexion à la base de données
sequelize.authenticate()
  .then(() => {
    console.log('Connexion à PostgreSQL réussie!');
  })
  .catch((err) => {
    console.error('Impossible de se connecter à PostgreSQL:', err);
  });

  export default sequelize;
