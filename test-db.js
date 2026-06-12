const oracledb = require('oracledb');
require('dotenv').config();
async function run() {
  let conn;
  try {
    conn = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING
    });
    const result = await conn.execute("SELECT table_name FROM user_tables");
    console.log(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    if (conn) await conn.close();
  }
}
run();
