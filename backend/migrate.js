import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from './db.js';

const umzug = new Umzug({
    migrations: { glob: 'migrations/*.js' },
    context: sequelize,
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
});

export const runMigrations = async () => {
    console.log('Running migrations...');
    await umzug.up();
    console.log('Migrations completed.');
};
