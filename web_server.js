// este archivo pertenece al servidor web que expone las coordenadas en la web

// Importamos los módulos necesarios
const express = require("express"); // Framework para crear el servidor web
const mysql = require("mysql"); // Módulo para interactuar con MySQL
const cors = require("cors"); // Módulo para permitir solicitudes de diferentes dominios (CORS)

const app = express(); // Inicializamos la aplicación Express
const port = 3000; // Definimos el puerto en el que escuchará el servidor

app.use(cors()); // Habilitamos CORS para permitir peticiones de otros orígenes
app.use(express.static("public")); // Servir archivos estáticos desde la carpeta "public"

// Configuración de la base de datos MySQL
const db = mysql.createConnection({
    host: "localhost", // Dirección del servidor de la base de datos
    user: "root", // Usuario de la base de datos
    password: "casabuela", // Contraseña del usuario
    database: "p1s4_db" // Nombre de la base de datos
});

// Conectar con la base de datos
db.connect(err => {
    if (err) {
        console.error("Error conectando a la base de datos:", err);
        return;
    }
    console.log("Conectado a la base de datos");
});

// Ruta principal `/` que devuelve el archivo HTML principal
app.get("/", (req, res) => {
    const query = "SELECT * FROM registros ORDER BY DATE DESC, TIME DESC LIMIT 1"; // Consulta para obtener el último registro
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Error en la consulta" });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: "No hay registros disponibles" });
        }
        res.sendFile(__dirname + "/public/index.html"); // Servimos la página HTML
    });
});

// Ruta `/data` para obtener el último registro en formato JSON
app.get("/data", (req, res) => {
    const query = "SELECT * FROM registros ORDER BY DATE DESC, TIME DESC LIMIT 1"; // Consulta para obtener el último registro
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Error en la consulta" });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: "No hay registros disponibles" });
        }
        res.json(result[0]); // Enviamos el último registro en formato JSON
    });
});

// Iniciar el servidor en el puerto especificado
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
