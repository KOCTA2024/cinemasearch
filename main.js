import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { configDotenv } from 'dotenv';

configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    switch (url.pathname) {
        case "/":
            res.writeHead(200, { "content-type": "text/html" });
            res.end(resolvePathToFile("index.html"));
            break;

        case "/style.css":
            res.writeHead(200, { "content-type": "text/css" });
            res.end(resolvePathToFile("style.css"));
            break;

        case "/script.js":
            res.writeHead(200, { "content-type": "application/javascript" });
            res.end(resolvePathToFile("script.js"));
            break;

        case "/search":
            const query = url.searchParams.get("query") ?? "";
            const genre = url.searchParams.get("genre") ?? "Drama";
            const originalTitle = url.searchParams.get("originalTitle") ?? "";

            try {
                const results = await search(query, genre, originalTitle);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify(results));
            } catch (err) {
                res.writeHead(500, { "content-type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
            }
            break;
        case "/availableGenres":
            try {
                const genres = await getGenres();
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify(genres));
            } catch (err) {
                res.writeHead(500, { "content-type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
            }
            break;

        default:
            res.writeHead(404);
            res.end("Not found");
    }
});

async function search(query, genre = "Drama", originalTitle = "") {
    const params = new URLSearchParams({
        type: "movie",
        genre,
        rows: 25,
        sortOrder: "ASC",
        sortField: "id",
        ...(query && { query }),
        ...(originalTitle && { originalTitle }),
    });

    const response = await fetch(
        `https://imdb236.p.rapidapi.com/api/imdb/search?${params}`,
        {
            method: "GET",
            headers: {
                "x-rapidapi-host": "imdb236.p.rapidapi.com",
                "x-rapidapi-key": process.env.RAPIDAPI_KEY,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    return response.json();
}

async function getGenres() {
    const response = await fetch(
        "https://imdb236.p.rapidapi.com/api/imdb/genres",
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-rapidapi-host": "imdb236.p.rapidapi.com",
                "x-rapidapi-key": process.env.RAPIDAPI_KEY,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    return response.json();
}

function resolvePathToFile(file) {
    return fs.readFileSync(path.join(__dirname, "static", file));
}

server.listen(3000, () => { console.log("started on :3000"); });