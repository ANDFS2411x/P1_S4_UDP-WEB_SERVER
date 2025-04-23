// Este archivo es el servidor UDP que recibe las coordenadas enviadas por la app

// Este archivo es el servidor UDP que recibe las coordenadas enviadas por la app

const dgram = require('dgram');
const mysql = require('mysql');
require('dotenv').config(); // 👈 Cargar variables del .env

const server = dgram.createSocket('udp4');

// 🔴 Configuración de la base de datos con variables de entorno
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect(err => {
  if (err) {
    return console.error('❌ Error al conectar a la base de datos: ' + err.stack);
  }
  console.log('✅ Conexión establecida con RDS, ID: ' + connection.threadId);
});

server.on('message', (msg, rinfo) => {
  console.log(`📩 Mensaje recibido: ${msg} de ${rinfo.address}:${rinfo.port}`);

  try {
    const data = JSON.parse(msg.toString());

    if (data.ID_TAXI && data.LONGITUDE && data.LATITUDE && data.DATE && data.TIME && data.RPM) {

      const query = 'INSERT INTO registros (ID_TAXI, LONGITUDE, LATITUDE, DATE, TIME, RPM) VALUES (?, ?, ?, ?, ?, ?)';

      connection.query(query, [data.ID_TAXI, data.LONGITUDE, data.LATITUDE,data.DATE, data.TIME, data.RPM], (error, results) => {
        if (error) {
          return console.error('❌ Error al insertar datos: ' + error.message);
        }
        console.log('✅ Datos insertados, ID: ' + results.insertId);
      });

    } else {
      console.log('⚠️ Datos incompletos o incorrectos:', data);
    }
  } catch (e) {
    console.error('❌ Error al parsear el JSON:', e.message);
  }
});

server.on('error', (err) => {
  console.error('❌ Error en el servidor UDP:', err.stack);
  server.close();
});

server.on('listening', () => {
  const address = server.address();
  console.log(`📡 Servidor UDP escuchando en ${address.address}:${address.port}`);
});

server.bind(50505); // Puerto de escucha UDP
