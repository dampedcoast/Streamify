const oracledb = require("oracledb");
require("dotenv").config();

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function initializeDatabase() {
  try {
    console.log("Oracle user:", process.env.ORACLE_USER);
    console.log("Oracle connect string:", process.env.ORACLE_CONNECT_STRING);

    await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1
    });

    console.log("Connected to Oracle Database");
  } catch (error) {
    console.error("Oracle connection error:", error);
    process.exit(1);
  }
}

async function executeQuery(sql, binds = {}) {
  let connection;

  try {
    connection = await oracledb.getConnection();

    const result = await connection.execute(sql, binds, {
      autoCommit: true
    });

    return result;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

module.exports = {
  initializeDatabase,
  executeQuery
};