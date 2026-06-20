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

    if (req.url.startsWith("/search")) {
        res.writeHead(200, { "content-type": "text/html" });
        res.end(resolvePathToFile("results.html"));
        return;
    }

    switch (url.pathname) {
        case "/":
            res.writeHead(200, { "content-type": "text/html" });
            res.end(resolvePathToFile("index.html"));
            break;

        case "/style.css":
            res.writeHead(200, { "content-type": "text/css" });
            res.end(resolvePathToFile("style.css"));
            break;
        case "/search_style.css":
            res.writeHead(200, { "content-type": "text/css" });
            res.end(resolvePathToFile("search_style.css"));
            break;
        case "/script.js":
            res.writeHead(200, { "content-type": "application/javascript" });
            res.end(resolvePathToFile("script.js"));
            break;

        case "/api/search": {
            const primaryTitle = url.searchParams.get("primaryTitle") ?? "";
            const genre = url.searchParams.get("genre") ?? "";
            const originalTitle = url.searchParams.get("originalTitle") ?? "";
            const aggregateRating = url.searchParams.get("aggregateRating") ?? "";

            // if (!primaryTitle && !genre && !originalTitle) {
            //     res.writeHead(400, { "content-type": "application/json" });
            //     res.end(JSON.stringify({ error: "Укажите хотя бы один параметр: primaryTitle, genre або originalTitle" }));
            //     break;
            // }

            try {
                // ✅ передаємо всі три параметри
                const results = await search(primaryTitle, genre, originalTitle, aggregateRating);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify(results));
            } catch (err) {
                res.writeHead(500, { "content-type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
            }
            break;
        }

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

        case "/topFilms":
            try {
                const films = await getTopFilms();
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify(films));
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

// ✅ виправлено: limit замість rows, додано originalTitle
async function search(query = "", genre = "", originalTitle = "", aggregateRating="") {
    const params = new URLSearchParams({
        // type: "movie",
        // limit: 10,          // ✅ було rows: 10 — API його ігнорувало
        // sortOrder: "DESC",
        // sortField: "numVotes",
        minAggregateRating: aggregateRating,
        maxAggregateRating: Number(aggregateRating) + 1,
        ...(genre && { genre }),
        ...(query && { query }),
        ...(originalTitle && { primaryTitle: originalTitle }), // ✅ тепер передається
    });

    const response = await fetch(
        `https://api.imdbapi.dev/titles?${params}`,
        {
            method: "GET",
            headers: {
                'accept': 'application/json'
            },
        }
    );

    if (!response.ok) {
        console.log(response)
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

async function getTopFilms() {
    const response = await fetch(
        "https://imdb236.p.rapidapi.com/api/imdb/top250-movies",
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