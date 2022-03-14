//#region API E KEY 
const token = '1792124174:AAFQIF2mJd_cqxTzewZ6ghGHRDR93aAp_MI';
const meteotoken = '5d7507703a0dadcd3c0916e43bf2f7f8';
//#endregion
// ↓ Librerie necessarie 
const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
const sql = require('mssql');
const evilDns = require('evil-dns');
// ↓ generazione bot
const bot = new TelegramBot(token, { polling: true });
// ↓ strutture dati per le query
var ArrRegioni = [];
var Keyboard = [];
var Querycapoluogo = [];
//↓ informazioni per la connessione a SQL Server tramite la mixed authentication 
const config = {
    user: 'sa',
    password: 'trDPKfd3.k',
    server: 'GIORGIO_MS2019\\GIORGIO_WS2019',
    // user: '5G07',
    // password: 'studente1',
    // server: 'C212-07',
    database: 'Luoghi', options: { encrypt: true } 
}
// ↓ istruzioni da seguire se nella chat l'utente ha scritto il comando /start, (l'avvio)
bot.onText(/\/start/, (msg) => {
    console.log(msg.from.first_name, msg.from.last_name + " (AKA) " +  msg.from.username +" ha scritto:" );
    console.log(msg.text); // ← se si vuole prendere  tutte le informazioni dell'utente che avvia il bot, anche solo nome-cognome o username per avere un riscontro lato console
    // ↓ preso in input il nome dell'utente, così da essere più user frendly
    const utente = msg.from.first_name;
    // ↓ messaggio iniziale, con subito l'apparizione della keyword, con cui l'utente può orientarsi 
    bot.sendMessage(msg.from.id, `Ciao ${utente}! \n Usa i miei comandi con "/" \n Ecco a te la tastiera per i comandi principali`,
        {
            "reply_markup": {
                "keyboard": [
                    ["/start", "Regioni"],
                    ["Posizione", "Meteo"],
                    ["Chiudi", "Aiuto"]
                ]
            }
        });
    // ↓ inizio della connessione SQL con la prima query, l'ho messsa nello start così si carica subito, e l'utente ha già dei risultati visibili se scatena l'evento che "lavora" con i dati da DB
    evilDns.add('db.client.local', '1.2.3.4');
    new sql.connect(config, err => {
        // ↓ nuova richiesta, creazione e esecuzione della query
        const request = new sql.Request()
        request.stream = true
        request.query('SELECT Regione FROM tabPosti')
        request.on('row', row => {
            // ↓ inserimento nell'array Regioni con una push il contenuto dei dati nel campo Regioni (Abruzzo, Basilicata, ..... Veneto)
            ArrRegioni.push(row.Regione);  
        });
    });
});
// ↓ istruzioni da seguire se nella chat l'utente ha scritto il comando /meteo      il simbolo (.+) indica qualsiasi carattere presente oltre al comando '/meteo'
bot.onText(/\/meteo (.+)/, (msg, match) => {
    // ↓ costante necessaria per far mandare al bot i messaggi nella chat
    const chatId = msg.chat.id;
    // ↓ controllo della variabile città con il match tramite l'operatore ternario: condizione ? se_vero : se_falso, così da mettere una stringa vuota  
    const città = match[1] ? match[1] : "";
    // ↓ messaggio di conferma di input
    bot.sendMessage(chatId, "Hai inserito : " + città);
    // ↓ metodo GET del protocollo HTTP per prendere il JSON in risposta dall'API della città, facendo arrivare ris, messaggio di ritorno
    http.get('http://api.openweathermap.org/data/2.5/weather?q=' + città + '&units=metric&lang=it&APPID=' + meteotoken, (risultato) => {
        // ↓ variabile necessaria per scaricare i dati, senza questa e la variabile 'dati' che continuano a prendere dati non sarebbe possibile l'utilizzo della API
        var Datiraw = '';
        // ↓ finché si possono prendere dei dati
        risultato.on('data', (dati) => { Datiraw += dati; });
        // ↓ quando abbiamo finito di ricevere dati c'è il try-catch per evitare lo scatenamento di eccezioni
        risultato.on('end', () => {
            try {
                // ↓ si esegue il metodo parse (array, stringa, int, bool equivalente al testo JSON) del risultato (la variabile 'Datiraw')
                const dataParse = JSON.parse(Datiraw);
                // ↓ array di messaggi, per non continuare a spammare il bot 
                var messaggi = [];
                // ↓ 3 push corrispondenti ai messaggi di meteo (in italiano, indicato dall'URL), la temperatura e la velocità del vento, ricavati tutti dall'API
                messaggi.push("Il meteo è: <b>" + dataParse.weather[0].description + "</b>");
                messaggi.push("La sua temperatura: <b>" + dataParse.main.temp + "</b> C°");
                messaggi.push("La velocità del vento: <b>" + dataParse.wind.speed + "</b> m / s");
                // ↓ messaggio che manda il bot con il join di tutti gli elementi dell'array 
                bot.sendMessage(chatId, messaggi.join("\n"), { parse_mode: "HTML" });
            } catch (e) {
                // ↓ nel caso in cui l'eccezione si scatena il bot manderà questo comando
                bot.sendMessage(chatId, "<b>OH NO!</b>\n<code>Non sono riuscito a trovare il luogo che mi hai indicato, prova a scriverlo correttamente </code>\n", { parse_mode: "HTML" })
            }
        })
        // ↓ se la GET non va a buon fine genera 'error', e il bot manderà l'eccezione in output con questo messaggio
    }).on('error', (e) => {
        bot.sendMessage(chatId, "Il bot non è riuscito a raggiungere la API per il meteo! \n " + e.message);
    });
});
// ↓ istruzioni da seguire se nella chat l'utente ha scritto il comando /posizione      il simbolo (.+) indica qualsiasi carattere presente oltre al comando '/posizione'
bot.onText(/\/posizione (.+)/, (msg, match) => {
    // ↓ parte simile al comando '/meteo'
    const chatId = msg.chat.id;
    const città = match[1] ? match[1] : "";
    bot.sendMessage(chatId, "Hai inserito : " + città);
    // ↓ la chiamata GET è uguale, cambiano i dati che si prenderanno dal json
    http.get('http://api.openweathermap.org/data/2.5/weather?q=' + città + '&units=metric&lang=it&APPID=' + meteotoken, (risultato) => {
        var Datiraw = '';
        risultato.on('data', (dati) => { Datiraw += dati; });
        risultato.on('end', () => {
            try {
                const dataParse = JSON.parse(Datiraw);
                bot.sendMessage(chatId, "Ecco a te la posizione di <b>" + città + "</b> che mi hai chiesto", { parse_mode: "HTML" });
                // ↓ qui il bot manda la posizione del luogo indicato dall'utente, con latitudine e longitudine ricevuti dall'API
                bot.sendLocation(chatId, dataParse.coord.lat, dataParse.coord.lon)
            } catch (e) {
                bot.sendMessage(chatId, "<b>OH NO!</b> \n <code>Non sono riuscito a trovare il luogo che mi hai indicato, prova a scriverlo correttamente </code>\n", { parse_mode: "HTML" })
            }
        })
    }).on('error', (e) => {
        bot.sendMessage(chatId, "Il bot non è riuscito a raggiungere la API per la posizione! \n " + e.message);
    });
});
bot.onText(/\/stop/, (msg) => {
    const chatId = msg.from.id;
    const utente = msg.from.first_name;
    // ↓ messaggio del bot prima della conclusione dello stesso
    bot.sendMessage(chatId, `È stato un piacere lavorare per te ${utente}! \nAuto-spegnimento fra... \n3..\n2..\n1..\n<code>Il bot si è arrestato</code>`, { parse_mode: "HTML" })
    // ↓ comando che termina la ricezione di qualsiasi messaggio, da testo a comando
    //bot.stopPolling();
});
// ↓ istruzioni da seguire se nella chat l'utente ha scritto qualsiasi messaggio diverso dai gestiti sopra
bot.on('message', (msg) => {
    // ↓ testo del messaggio inserito dall'utente
    var strmsg = msg.text;
    const chatId = msg.chat.id;
    // ↓ gestisco i vari casi di messaggi con il metodo toLowerCase per avere input in-sensitive (Meteo = meteo)    ! in questo modo gestisco anche i click sulla keyboard-guida dell'utente
    switch (strmsg.toLowerCase()) {
        // ↓ vari messaggi del bot per le casistiche
        case "/start":
            break;
        case "meteo":
            bot.sendMessage(chatId, "Non hai inserito il comando con '/ ', \n scrivi ad esempio -> /meteo Napoli")
            break;
        case "ciao":
            bot.sendMessage(chatId, `Ciao <b>${msg.from.first_name}!</b> \n<code>Grazie per utilizzarmi, spero di essere stato costruito bene! </code>\n\nAh dimenticavo, se hai bisogno di me, non esitare a scrivere "aiuto" `, { parse_mode: "HTML" })
            break;
        case "posizione":
            bot.sendMessage(chatId, "Non hai inserito il comando con '/', \n scrivi ad esempio -> /posizione Piacenza")
            break;
        case "/posizione":
            bot.sendMessage(chatId, "Se qualche comando non funziona, \nrircoda di specificarmi il luogo da cercare: \ncome -> /posizione Bologna \nGrazie!")
            break;
        case "/meteo":
            bot.sendMessage(chatId, "Se qualche comando non funziona, \nrircoda di specificarmi il luogo da cercare: \ncome -> /meteo Torino \nGrazie!")
            break;
        case "aiuto":
            bot.sendMessage(chatId, "<b>Benvenuto nella sezione Aiuto</b>\nSono qui per aiutarti: \nPer iniziare puoi premere il comando '/start' per sapere come vedere i miei comandi e avere una tastiera di supporto\n\nTranquillo, sono user friendly, quindi cercherò di assisterti il più possibile!", { parse_mode: "HTML" })
            break;
        case "chiudi":
            bot.sendMessage(chatId, "Hai selezionato:  ' Chiudi ' \nPer spegnermi digita il comando '/stop'.\nDopo questo comando non potrò più rispondere, quindi dovrai riavviarmi completamente. \nGrazie!")
            break;
        case "/regioni":
            bot.sendMessage(chatId, "Premi il bottone sulla tastiera per avere l'elenco di tutte e 20 le regioni italiane! \n<b>Buona scelta!</b>", { parse_mode: "HTML" })
            break;
        case "regioni":
            /* ↓  questo non si limita a dell'output ma lavora con il DB, in particolare il forEach dell'array ArrRegioni carica tutti i dati della query nell'array Keyboard, che saranno degli inline button
               ↓ ogni inline button ha 2 proprietà: testo (quello che ha scritto sopra) e callback_data che serve alla "chiamata" back-end (approfondimento in seguito)                                     */
            ArrRegioni.forEach(reg => { Keyboard.push([{ "text": reg, "callback_data": "reg:" + reg }]) });
            // ↓ output di tutti i bottoni inline
            ArrRegioni = [];
            const btnRegioni = {
                reply_markup: {
                    resize_keyboard: true,
                    one_time_keyboard: true,
                    inline_keyboard: Keyboard
                }
            };
            bot.sendMessage(chatId, "Ecco a te l'elenco delle regioni italiane: \nSeleziona quella che ti interessa", btnRegioni);
            break;
            // ↓ gestione del caso che poteva generare errore quando veniva eseguito un comando, come '/posizione'
        case !("/"):
            bot.sendMessage(chatId, "Mi spiace, ma quello che hai scritto non rientra nei miei comandi :(");
            break;
    }
});
// ↓ istruzioni da seguire per quanto riguarda il call-to-action (il click di un inline button), scatenando questo evento
bot.on('callback_query', (msg) => { 
    const chatId = msg.message.chat.id;
    // ↓ individuazione della regione cliccata prendendo il testo del bottone
    var regione = msg.data;
    // ↓ dato che ogni bottone ha la proprità callback_data a seconda del tipo (possoono essere di 3 tipi), tutti li divido con ':' e prendo la prima parte
    switch(regione.split(':')[0]){
        // ↓ reg sta per 'Regioni' per ricordare la query 
        case "reg":
            evilDns.add('db.client.local', '1.2.3.4');
            // ↓ svuoto la keyboard sennò contninuerebbe a dublicare gli inline button, cosa che non deve succedere. In questo modo lo popolo sempre una sola volta
            Keyboard = [];
            // ↓ seconda connessione e seconda richiesta: questa serve per prendere Capoluogo e coordinate (lat e lon) degli altri dati nel DB 
            new sql.connect(config, err => {
                const request = new sql.Request()
                request.stream = true
                // ↓ la condizione che è imposta nella query è presa dalla proprietà callback_data del bottone, diversa per ognuno
                request.query("SELECT Luogo,Latitudine,Longitudine FROM tabPosti WHERE Regione='"+regione.split(':')[1]+"'")         
                request.on('row', row => {
                    // ↓ come prima per Keyboard, anche qui "svuoto" l'array per non duplicare il tutto 
                    Querycapoluogo = [];
                    // ↓ inserisco con una push i dati nelle celle dei tre i campi (Capoluogo, Latitudine e Longitudine) nell'array
                    Querycapoluogo.push(row.Luogo);
                    Querycapoluogo.push(row.Latitudine);
                    Querycapoluogo.push(row.Longitudine);
                    // ↓ il bot manda il Capoluogo, che è il primo elemento che ho preso dalla tabella, usando direttamente row
                    bot.sendMessage(chatId, `\n\nIl capoluogo della regione che hai selezionato è: \n\n`+ row.Luogo ,{               
                    reply_markup: {
                        resize_keyboard: true,
                        one_time_keyboard: true,
                        // ↓ in questa creazione di bottoni inline ci sono due tipi di bottoni, meteo e pos, NON REG, perché dò all'utente la possibilità di scegliere cosa cercare del capoluogo
                        inline_keyboard: [[{"text" : 'Meteo' ,"callback_data" : "meteo:" }, {"text" : 'Posizione' ,"callback_data" : "pos:" }]] } 
                    });
                });
            });
        break;
        // ↓ gestione del click del bottone meteo di un capoluogo
        case "meteo":
            CalcolaMeteo(chatId);
        break;
        // ↓ semplice messaggio bot che manda una posizione con i dati che sono nell'array quando è stato inserito il capoluogo (Querycapoluogo.push) di latitudine e longitudine presenti nel DB
        case "pos":
            bot.sendLocation(chatId, Querycapoluogo[1],Querycapoluogo[2]);
            break; 
    }
});
// ↓ messaggio da mettere SEMPRE alla fine , specifica l'errore generale di bot, per capire meglio dove è il problema da risolvere
bot.on('polling_error', (msg) => { console.log(msg) });

// ↓ funzione per il calcolo del meteo avendo ricevuto dall'utente il capoluogo tramite il click di un bottone inline
function CalcolaMeteo(chatId) {
    // ↓ metodologia analoga per il comando '/meteo (.+)'
    http.get('http://api.openweathermap.org/data/2.5/weather?q=' + Querycapoluogo[0] + '&units=metric&lang=it&APPID=' + meteotoken, (risultato) => {
        var Datiraw = '';
        risultato.on('data', (dati) => { Datiraw += dati; });
        risultato.on('end', () => {
            try {
                const dataParse = JSON.parse(Datiraw);
                var messaggi = [];
                messaggi.push("Il meteo del capoluogo che hai scelto è:\n<b>" + dataParse.weather[0].description + "</b>")
                messaggi.push("La sua temperatura: <b>" + dataParse.main.temp + "</b> C°");
                messaggi.push("La velocità del vento: <b>" + dataParse.wind.speed + "</b> m / s")
                bot.sendMessage(chatId, messaggi.join("\n"), { parse_mode: "HTML" });
            // ↓ non dovrebbe comunque verificarsi un'eccezione perché tutti i capoluoghi sono presi da DB, quindi non randomici, inseriti dall'utente
            } catch (e) {
                bot.sendMessage(chatId, "<b>OH NO!</b> \n <code>Non sono riuscito a trovare il luogo che mi hai indicato, prova a scriverlo correttamente </code>\n", { parse_mode: "HTML" })
            }
        });
    })
}