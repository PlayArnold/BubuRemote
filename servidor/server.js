
const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer, WebSocket } = require("ws");
const { randomInt } = require("crypto");

const app = express();
const servidor = http.createServer(app);
const wss = new WebSocketServer({ server: servidor });

const PORT = process.env.PORT || 3000;
const salas = new Map();

const carpetaCliente = path.join(__dirname, "../cliente");

app.use(express.static(carpetaCliente));

app.get("/", (req, res) => {
    res.sendFile(path.join(carpetaCliente, "index.html"));
});

function generarCodigo() {
    let codigo;

    do {
        codigo = String(randomInt(100000, 1000000));
    } while (salas.has(codigo));

    return codigo;
}

function enviar(socket, datos) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(datos));
    }
}

wss.on("connection", (socket) => {
    socket.on("message", (mensaje) => {
        let datos;

        try {
            datos = JSON.parse(mensaje.toString());
        } catch {
            enviar(socket, {
                tipo: "error",
                mensaje: "Mensaje no válido"
            });
            return;
        }

        if (!datos || typeof datos.tipo !== "string") return;

        if (datos.tipo === "crear_sala") {
            if (socket.sala) return;

            const codigo = generarCodigo();

            salas.set(codigo, {
                host: socket,
                cliente: null,
                creada: Date.now()
            });

            socket.sala = codigo;
            socket.rol = "host";

            enviar(socket, {
                tipo: "sala_creada",
                codigo
            });

            return;
        }

        if (datos.tipo === "unirse_sala") {
            if (socket.sala) return;

            const codigo = String(datos.codigo || "");
            const sala = salas.get(codigo);

            if (!/^\d{6}$/.test(codigo) || !sala || sala.cliente) {
                enviar(socket, {
                    tipo: "error",
                    mensaje: "Código incorrecto o sala ocupada"
                });
                return;
            }

            sala.cliente = socket;
            socket.sala = codigo;
            socket.rol = "cliente";

            enviar(socket, { tipo: "conectado" });

            enviar(sala.host, {
                tipo: "cliente_conectado"
            });

            return;
        }

        if (datos.tipo === "voz" && socket.rol === "cliente") {
            const sala = salas.get(socket.sala);

            if (!sala || sala.cliente !== socket) return;

            enviar(sala.host, {
                tipo: "voz",
                hablando: datos.hablando === true
            });
        }
    });

    socket.on("close", () => {
        const codigo = socket.sala;
        if (!codigo) return;

        const sala = salas.get(codigo);
        if (!sala) return;

        if (socket.rol === "host") {
            enviar(sala.cliente, { tipo: "desconectado" });
            salas.delete(codigo);
        } else if (socket.rol === "cliente") {
            sala.cliente = null;

            enviar(sala.host, {
                tipo: "cliente_desconectado"
            });
        }
    });
});

servidor.listen(PORT, "0.0.0.0", () => {
    console.log(`BubuRemote Server activo en el puerto ${PORT}`);
});
