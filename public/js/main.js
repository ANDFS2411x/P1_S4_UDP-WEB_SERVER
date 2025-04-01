// Configuración global
const config = {
    basePath: window.location.pathname.includes("/test") ? "/test" : "",
    updateInterval: 5000
};

console.log(config.basePath);