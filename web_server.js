// 📁 Este archivo pertenece al servidor web que expone las coordenadas en la web

// 🚀 Importamos el framework Express para crear el servidor
const express = require("express");

// 🗄️ Importamos el módulo de MySQL para conectarnos a la base de datos
const mysql = require("mysql");

// 🔓 Importamos CORS para permitir que otras páginas puedan hacer peticiones a nuestro servidor
const cors = require("cors");

const path = require('path');

// 🌿 Cargamos las variables de entorno desde el archivo .env
require('dotenv').config(); // Carga variables del .env
console.log("Google Maps API Key:", process.env.GOOGLE_MAPS_API_KEY);

// 🎉 Creamos una aplicación de Express (nuestro servidor)
const app = express();

// 🔢 Definimos el puerto en el que va a correr el servidor
const port = process.env.PORT || 3000;
console.log(`Puerto: ${port}`);
const basePath = port == 9000 ? "/test" : "/";
console.log(`path: ${basePath}`);

// 📦 Agregamos el middleware de CORS a nuestra app para aceptar peticiones de otros lugares
app.use(cors());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ------------------- 🔴 CONFIGURAMOS LA CONEXIÓN A LA BASE DE DATOS ------------------- */
const db = mysql.createConnection({
    host: process.env.DB_HOST,  // 🌍 Dirección del servidor de la base de datos
    user: process.env.DB_USER,  // 👤 Usuario para entrar a la base de datos
    password: process.env.DB_PASSWORD,  // 🔐 Contraseña del usuario
    database: process.env.DB_NAME // 📚 Nombre de la base de datos
});

// 📡 Nos conectamos a la base de datos
db.connect(err => {
    if (err) {
         // ❌ Si hay un error, lo mostramos en la consola
        console.error("❌ Error conectando a la base de datos:", err);
        return;
    }
     // ✅ Si todo sale bien, mostramos que estamos conectados
    console.log("✅ Conectado a la base de datos RDS");
});

/* ------------------- 🔧 RUTA PARA OBTENER LA API KEY DE GOOGLE MAPS ------------------- */
app.get("/api-key", (req, res) => {
    // Cuando se haga el fetch /api-key, se da la clave de Google Maps:
    const apiKey = process.env.GOOGLE_MAPS_API_KEY; // 🔐 Tomamos la API key de las variables de entorno
   // Si no hay API Key, mandamos un error
    if (!apiKey) {
        return res.status(500).json({ error: "No se encontró la API KEY" });
    }
    // Si hay clave, la enviamos en formato JSON
    res.json({ apiKey });
});

/* ------------------- 🔧 RUTA PARA OBTENER LOS DATOS DE LA TABLA REGISTROS ------------------- */
// Cuando alguien visite /data, le damos el último registro guardado en la base de datos
app.get("/data", (req, res) => {
    // Consulta SQL para traer el último registro de la tabla "registros"
    const query = "SELECT * FROM registros ORDER BY DATE DESC, TIME DESC LIMIT 1";
    // Hacemos la consulta a la base de datos
    db.query(query, (err, result) => {
        if (err) {
            // ❌ Si hay un error en la consulta, lo mostramos
            console.error("❌ Error en la consulta:", err);
            return res.status(500).json({ error: "Error en la consulta" });
        }
        // Si no hay resultados, mandamos un mensaje
        if (result.length === 0) {
            return res.status(404).json({ error: "No hay registros disponibles" });
        }
        // ✅ Si todo sale bien, enviamos el primer (y único) registro encontrado
        res.json(result[0]);
    });
});

/* ------------------- 🔧 RUTA PARA DATOS HISTÓRICOS ------------------- */
app.get("/historical-data", (req, res) => {
    const { startDate, endDate } = req.query;
    console.log("StartDate recibido:", startDate);
    console.log("EndDate recibido:", endDate);

    if (!startDate || !endDate) {
        return res.status(400).json({ 
            success: false,
            error: "Se requieren ambas fechas",
            data: []
        });
    }

    const query = `
        SELECT * FROM registros 
        WHERE CONCAT(DATE, ' ', TIME) BETWEEN ? AND ?
        ORDER BY DATE ASC, TIME ASC
    `;

    const params = [
        startDate.replace('T', ' ') + ':00',  // Formato: 'YYYY-MM-DD HH:MM:00'
        endDate.replace('T', ' ') + ':00'
    ];

    console.log("Query ejecutado:", query.replace(/\?/g, (_, i) => params[i]));

    db.query(query, params, (err, results) => {
        if (err) {
            console.error("❌ Error en la consulta:", err);
            return res.status(500).json({
                success: false,
                error: "Error en la base de datos",
                data: []
            });
        }

        // ✅ Debug: Mostrar resultados de la BD
        console.log("Respuesta de la BD:", {
            rowCount: results.length,
            firstRow: results[0] || null,
            queryExecuted: query.replace(/\?/g, (_, i) => params[i])
        });

        res.json({
            success: true,
            count: results.length,
            data: results
        });
    });
});

/* ------------------- 🟢 SERVIR ARCHIVOS ESTÁTICOS ------------------- */
// Esto sirve archivos estáticos que estén en la carpeta "public", por ejemplo: HTML, CSS, imágenes...
// Se pone después de las rutas para que no bloquee las APIs que hicimos antes

app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.render('main', { title: process.env.PAGE_TITLE, path: basePath });
});

/* ------------------- 🚀 INICIAMOS EL SERVIDOR ------------------- */
// Arrancamos el servidor en el puerto definido y en cualquier IP ('0.0.0.0')
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor web corriendo en http://0.0.0.0:${port}`);
});
