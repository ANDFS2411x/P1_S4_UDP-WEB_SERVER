// este archivo es el servidor UDP que recibe las coordenadas enviadas por la app

// importamos modulos para crear server udp, socket ipv4
// e interactuar con la base de datos MYSQL
const dgram = require('dgram');
const mysql = require('mysql');
const server = dgram.createSocket('udp4');

// Configuración de la conexión a la base de datos MySQL
const connection = mysql.createConnection({
  host: 'localhost',// esta es la direccion del serverMySQL
  user: 'root',//user
  password: 'casabuela', //contraseña
  database: 'p1s4_db' //nombre de la base de dattos
});
//aqui nos conectamos a la base de datos
connection.connect(err => {
  if (err) {
    return console.error('Error al conectar a la base de datos: ' + err.stack);
  }
  console.log('Conexión establecida con la base de datos con ID ' + connection.threadId);
});

// Escucha de mensajes UDP
// se ejecuta cuando el server recibe mensaje udp
server.on('message', (msg, rinfo) => {
  console.log(`Servidor recibió: ${msg} de ${rinfo.address}:${rinfo.port}`);

  try {
    // conversion de mensaje recibido en json a objeto javascript
    const data = JSON.parse(msg.toString());
    // acá verificamos si el mensaje contiene todos los datos necesarios 
    if (data.ID_TAXI && data.LONGITUDE && data.LATITUDE && data.DATE && data.TIME) {
      // definimos la consulta SQL para insertar los datos en la base de datos
      const query = 'INSERT INTO registros (ID_TAXI, LONGITUDE, LATITUDE, DATE, TIME) VALUES (?, ?, ?, ?, ?)';
      // se hace la consulta con los valores recibidos
      connection.query(query, [data.ID_TAXI, data.LONGITUDE, data.LATITUDE, data.DATE, data.TIME], (error, results) => {
        if (error) {
          return console.error('Error al insertar datos: ' + error.message);
        }
        console.log('Datos insertados, ID: ' + results.insertId);
      });
    } else {
      console.log('Datos recibidos incompletos o incorrectos:', data);
    }
  } catch (e) {
    console.error('Error al parsear el mensaje JSON:', e.message);
  }
});

// evento que se ejecuta en caso de error en el servidor udp
server.on('error', (err) => {
  console.error('Error en el servidor UDP:', err.stack);
  server.close(); // cerramos el server en caso de algun error
});
// Evento que se ejecuta cuando el servidor comienza a escuchar conexiones
server.on('listening', () => {
  const address = server.address();
  console.log(`Servidor UDP escuchando ${address.address}:${address.port}`);
});

server.bind(50505); // UDP escucha en el puerto 50505
