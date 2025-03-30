import sqlite3 from 'sqlite3';
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './contents.db',
    logging: false,
});

const db = new sqlite3.Database('./contents.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err);
    } else {
        console.log('Connected to SQLite database.');
    }
});

export { db, sequelize };
