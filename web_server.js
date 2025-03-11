// este archivo pertenece al servidor web que expone las coordenadas en la web
const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
require('dotenv').config(); // Carga variables del .env

const app = express();
const port = 3000;

// Middlewares
app.use(cors());

// 🔴 Configuración de la base de datos
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Conectar con la base de datos
db.connect(err => {
    if (err) {
        console.error("❌ Error conectando a la base de datos:", err);
        return;
    }
    console.log("✅ Conectado a la base de datos RDS");
});

// 🔧 Ruta para obtener la API Key
app.get("/api-key", (req, res) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "No se encontró la API KEY" });
    }
    res.json({ apiKey });
});

// 🔧 Ruta para obtener los datos de la tabla `registros`
app.get("/data", (req, res) => {
    const query = "SELECT * FROM registros ORDER BY DATE DESC, TIME DESC LIMIT 1";
    db.query(query, (err, result) => {
        if (err) {
            console.error("❌ Error en la consulta:", err);
            return res.status(500).json({ error: "Error en la consulta" });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: "No hay registros disponibles" });
        }

        res.json(result[0]);
    });
});

// 🟢 Sirve los archivos estáticos después de las rutas para que no pise las APIs
app.use("/", express.static("public"));

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor web corriendo en http://0.0.0.0:${port}`);
});
