const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Setarea motorului de template EJS
app.set('view engine', 'ejs');
// Setarea directorului pentru fisierele EJS
app.set('views', path.join(__dirname, 'views'));

console.log("Calea folderului proiectului:", __dirname);
console.log("Calea fisierului curent:", __filename);
console.log("Folderul curent de lucru:", process.cwd());

// Definirea folderului de resurse statice
app.use("/resurse", express.static(path.join(__dirname, "resurse")));
app.use("/css", express.static(path.join(__dirname, "css")));

// Crearea folderelor temporare daca nu exista
const vect_foldere = ["temp"]; // Am scos temp1 pentru curatenie
vect_foldere.forEach(folder => {
    const caleFolder = path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder);
    }
});

// Variabila globala pentru erori
const obGlobal = {
    obErori: null,
    initErori: function() {
        // Citim fisierul sincron, deoarece este necesar la pornirea serverului
        const continutErori = fs.readFileSync(path.join(__dirname, 'erori.json')).toString("utf-8");
        this.obErori = JSON.parse(continutErori);
        // Construim calea absolută pentru imagini
        this.obErori.info_erori.forEach(eroare => {
            eroare.imagine = path.join("/", this.obErori.cale_baza, eroare.imagine);
        });
        this.obErori.eroare_default.imagine = path.join("/", this.obErori.cale_baza, this.obErori.eroare_default.imagine);
    }
};

obGlobal.initErori();

// Functia pentru afisarea erorilor
function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find(e => e.identificator === identificator);
    if (eroare) {
        if (eroare.status) {
            res.status(identificator);
        }
        res.render('pagini/eroare', {
            titlu: titlu || eroare.titlu,
            text: text || eroare.text,
            imagine: imagine || eroare.imagine
        });
    } else {
        const eroareDefault = obGlobal.obErori.eroare_default;
        res.render('pagini/eroare', {
            titlu: titlu || eroareDefault.titlu,
            text: text || eroareDefault.text,
            imagine: imagine || eroareDefault.imagine
        });
    }
}

// Rutele aplicatiei
app.get(["/", "/index", "/home"], (req, res) => {
    res.render('pagini/index', { ip: req.ip });
});

// Ruta pentru favicon
app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "resurse/ico/favicon.ico"));
});

// Interzicerea accesului la folderele de resurse
app.get(/^\/resurse(\/.*)?$/, (req, res) => {
    // Verificam daca se cere un folder sau un fisier specific
    if (req.path.endsWith('/')) {
        afisareEroare(res, 403);
    }
    // Daca este fisier, middleware-ul `express.static` ar trebui sa-l serveasca inainte.
    // Daca ajunge aici, inseamna ca fisierul nu a fost gasit.
    else {
        afisareEroare(res, 404);
    }
});

// Interzicerea accesului la fisierele .ejs
app.get(/.*\.ejs$/, (req, res) => {
    afisareEroare(res, 400);
});

// Ruta generala pentru orice alta pagina
// CORECTAT: Sintaxa pentru a prinde orice cale
app.get('/:pagina', (req, res) => {
    const pagina = req.params.pagina;
    res.render(path.join('pagini', pagina), { ip: req.ip }, (err, html) => {
        if (err) {
            if (err.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404);
            } else {
                console.error("Eroare la randare:", err);
                afisareEroare(res); // Eroare generica
            }
        } else {
            res.send(html);
        }
    });
});

// Pornirea serverului
app.listen(8080, () => {
    console.log("Serverul a pornit pe portul 8080");
});
