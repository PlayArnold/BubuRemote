const { app, BrowserWindow } = require("electron");
const path = require("path");

let ventana;

function createWindow() {
    ventana = new BrowserWindow({
        width: 600,
        height: 600,
        transparent: true,
        frame: false,
        resizable: true,
        alwaysOnTop: true,
        backgroundColor: "#00000000",
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    ventana.loadFile(path.join(__dirname, "index.html"));

    ventana.on("closed", () => {
        ventana = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
