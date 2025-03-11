// este archivo pertenece al servidor web que expone las coordenadas en la web

const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
require('dotenv').config(); // 👈 Carga las variables de entorno
const app = express();
const port = 3000;


// Ruta para obtener la API Key de Google Maps
app.get("/api-key", (req, res) => {
    res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
});


app.use(cors());
app.use("/", express.static("public"));


// 🔴 NUEVA Configuración de la base de datos MySQL en AWS RDS
// 🔴 Configuración de la base de datos con variables de entorno
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

// Ruta principal `/`
app.get("/", (req, res) => {
    const query = "SELECT * FROM registros ORDER BY DATE DESC, TIME DESC LIMIT 1";
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Error en la consulta" });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: "No hay registros disponibles" });
        }
        res.sendFile(__dirname + "/public/index.html");
    });
});

// Ruta `/data` para obtener el último registro en formato JSON
app.get("/data", (req, res) => {
    const query = "SELECT * FROM registros ORDER BY DATE DESC, TIME DESC LIMIT 1";
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Error en la consulta" });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: "No hay registros disponibles" });
        }
        res.json(result[0]);
    });
});


app.listen(3000, '0.0.0.0', () => {
    console.log('Servidor corriendo');
  });
