import { Sequelize } from 'sequelize';


const sequelize = new Sequelize('postgres://postgres:8ULMJvhsO6DrTWbX6UVK@localhost:5432/flux_rss', {
  dialect: 'postgres',
  logging: false, e
});


sequelize.authenticate()
  .then(() => {
    console.log('Connexion à PostgreSQL réussie!');
  })
  .catch((err) => {
    console.error('Impossible de se connecter à PostgreSQL:', err);
  });

  export default sequelize;
