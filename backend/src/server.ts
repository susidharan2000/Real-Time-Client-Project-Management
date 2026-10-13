import "dotenv/config";
import { createServer } from "node:http";
import { app } from "./app.js";
import { pool } from "./db/pool.js";
import { setupSocket } from "./socket/socket.js";
import { startOverdueJob } from "./jobs/overdue.job";

const port = Number(process.env.PORT ?? 3000);
const server = createServer(app);
const io = setupSocket(server);
app.locals.io = io;

async function startServer() {
    try{
        //check connection to the database
        await pool.query("SELECT 1");
        console.log("PostgreSQL connected");

        //start corn job
        startOverdueJob(io);


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
