import "dotenv/config";
import { createServer } from "node:http";
import { app } from "./app.js";
import { pool } from "./db/pool.js";

const port = Number(process.env.PORT ?? 3000);
const server = createServer(app);

async function startServer() {
    try{
        //check connection to the database
        await pool.query("SELECT 1");
        console.log("PostgreSQL connected");


        server.listen(port, "0.0.0.0", () => {
             console.log(`API listening on port ${port}`);
        });
    }
    catch (error) {
        console.error("Error starting server:", error);
        await pool.end();
        process.exit(1);
    }
}

void startServer();