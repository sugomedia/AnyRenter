// *************************************************** 
// *************   NODEJS BACKEND API   **************
// ***************************************************


// ---------------------------------------------------
// ******************   SETTINGS   *******************
// ---------------------------------------------------

require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const path = require('path');
const moment = require('moment');
const fs = require('fs');
var multer = require('multer');
var im = require('imagemagick');
const cron = require('node-cron');
var exec = require('child_process').exec;
const mysqldump = require('mysqldump');
var nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');
const { jsPDF } = require("jspdf");
require('jspdf-autotable')
const { getOp, log, format } = require('./utils/functions.js');
const app = new express();
const port = process.env.PORT || 5000;
const token = process.env.TOKEN;
const uploadsDir = process.env.UPLOADS_DIR;

// MySQL connection settings
var pool = mysql.createPool({
    // connectionLimit: 10,
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    database: process.env.DBNAME
});

// MYSQL connection
pool.getConnection(function (err,  connection)  {
    if (err) {
        log('SERVER', `MySQL DATABASE connection error!`, 'error');
    } else {
        log('SERVER', `Connected to MySQL DATABASE.`, 'notice');
    }
});

// ---------------------------------------------------
// *****************   MIDDLEWARES   *****************
// ---------------------------------------------------

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', true);

// Check API token
function tokencheck() {
    return (req, res, next) => {
        if (req.headers.authorization == token) {
            next();
        } else {
            log(req.socket.remoteAddress, `Token check error!`, 'error');
            res.status(500).json({ message: 'Illetéktelen hozzáférés!' });
        }
    };
}

app.post('/checkIP', tokencheck(), (req, res) => {
    let akttime = moment();
    let storeIP = true;
    pool.query(`SELECT * FROM ipaddresses WHERE ipaddress=? ORDER BY date DESC LIMIT 1`, [req.ip], (err, result) => {
        if (err) {
            log(req.socket.remoteAddress, `IP check error!`, 'error');
            res.status(500).json(err);
        } else {
            if (result.length > 0) {
                storeIP = false;
                let lasttime = result[0].date;
                let diff = moment(akttime).diff(moment(lasttime)) / (1000 * 60 * 60);
                if (diff > 1) {
                    storeIP = true;
                }
            }

            if (storeIP) {
                pool.query(`INSERT INTO ipaddresses (ID, ipaddress) VALUES(null, '${req.ip}')`, (err, results) => {
                    if (err) {
                        log(req.socket.remoteAddress, err, 'danger');
                        res.status(500).json(err);
                    } else {
                        log(req.socket.remoteAddress, `1 record inserted to the ipaddresses table.`, 'notice');
                        res.status(200).json(results);
                    }
                });
            } else {
                res.status(200).json(result);
            }
        }
    });
});

// ---------------------------------------------------
// ***************   FILE OPERATIONS   ***************
// ---------------------------------------------------

// Image file Upload settings
var IMGstorage = multer.diskStorage({
    destination: uploadsDir,
    filename: function(req, file, cb) {
        let file_name = file.originalname.replace(path.extname(file.originalname), "") + '-' + Date.now() + path.extname(file.originalname);
        cb(null, file_name);
    }
});

var uploadIMG = multer({ storage: IMGstorage });

// Upload image file
app.post('/uploadImage', tokencheck(), uploadIMG.single('file'), (req, res) => {

    console.log(req.file.filename)
    res.status(200).json(req.file);

});

// FILE downloading 
app.post('/downloadFile', tokencheck(), (req, res) => {});

// FILE DELETE
app.delete('/removeFile/:table/:field/:id', tokencheck(), (req, res) => {
    let table = req.params.table;
    let field = req.params.field;
    let id = req.params.id;
    pool.query(`SELECT * FROM ${table} WHERE ID=${id}`, (err, results) => {
        let fileName = results[0].logo;
        if (fileName != '') {
            fs.rm('../' + fileName, (err) => {
                if (err) {
                    res.status(500).json(err);
                } else {
                    res.status(200).json(results[0].filename);
                }
            });
        } else {
            res.status(200).json(results[0].filename);
        }

    });
});

// FILE RESIZEING
app.post('/resizeFile', tokencheck(), (req, res) => {});

// ---------------------------------------------------
// *****************   DATA EXPORTS   ****************
// ---------------------------------------------------

// exporting to XLS
app.get('/exportToXLS', tokencheck(), (req, res) => {});

// DATABASE DUMP
var task = cron.schedule('59 23 * * *', () => {

    const fileName = `${process.env.DBNAME}_${moment().format('YYYY_MM_DD H:mm')}.sql`;

    mysqldump({
        connection: {
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'termeles',
        },
        dumpToFile: process.env.BACKUP_DIR + fileName,
    });

    fs.readdirSync(process.env.BACKUP_DIR).forEach(file => {
        const isOlder = fs.statSync(process.env.BACKUP_DIR + file).ctime < Date.now() - 864000000 // 10 nap 604800000 // 604800000 = 7 * 24 * 60 * 60 * 1000

        if (isOlder) {
            fs.unlinkSync(process.env.BACKUP_DIR + file);
        }

    })

    log('SERVER', `Database backup was created.`, 'notice');
});

task.start();

// ---------------------------------------------------
// **************   SERVER ENDPOINTS   ***************
// ---------------------------------------------------

// Server listening
app.listen(port, () => {
    log('SERVER', `Listening started on port ${port}.`, 'notice');
});

// TEST Database Connection
app.get('/DBtest', tokencheck(), (req, res) => {
    pool.getConnection(function(err, connection) {
        if (err) {
            log(req.socket.remoteAddress, `Database Connection Test - Failed`, 'error');
            res.status(500).send(err);
        } else {
            log(req.socket.remoteAddress, `Database Connection Test - OK`, 'warning');
            res.status(200).send('OK');
        }
    });
});

// Program info
app.get('/', tokencheck(), (req, res) => {
    log(req.socket.remoteAddress, `Sent program name.`, 'notice');
    res.status(200).send('Sugomedia NodeJS server API');
});

// Get server uptime
app.get('/uptime', (req, res) => {
    var uptime = process.uptime();
    log(req.socket.remoteAddress, `Sent server uptime information.`, 'notice');
    res.status(200).send(format(uptime));
});

// Get API version
app.get('/getApiVer', (req, res) => {
    log(req.socket.remoteAddress, `Sent API version information.`, 'notice');
    res.status(200).send(process.env.APIVER);
});

// LOGINCHECK
app.post('/login', tokencheck(), (req, res) => {
    var data = req.body;
    pool.query(`SELECT * FROM ${Object.values(data)[0]}  WHERE ${Object.keys(data)[1]}=? AND ${Object.keys(data)[2]}=?`, [Object.values(data)[1], Object.values(data)[2]], (err, results) => {
        if (err) {
            log(req.socket.remoteAddress, err, 'danger');
            res.status(500).send(err);
        } else {
            log(req.socket.remoteAddress, `${results.length} record(s) sent form ${Object.values(data)[0]} table (logincheck).`, 'notice');
            res.status(200).send(results);
        }
    });
});

app.post('/exportToXLS', tokencheck(), (req, res) => {
    let title = req.body.title;
    let results = req.body.results;
    const path = "../Public/exports";
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title, {
        pageSetup: { paperSize: 9, orientation: 'landscape' }
    });

    worksheet.columns = req.body.columns;

    worksheet.getRow(1).eachCell((cell) => { cell.font = { bold: true }; });

    results.forEach(result => {
        let oneRow = {};

        req.body.columns.forEach(column => {
            attr = column.key;

            let keys = Object.keys(result);
            let values = Object.values(result);

            let idx = keys.findIndex(item => item === attr);

            oneRow[keys[idx]] = values[idx];

        });

        worksheet.addRow(oneRow);
    });

    try {
        workbook.xlsx.writeFile(`${path}/${title}.xlsx`).then(function() {
            log(`${req.socket.remoteaddress} > XLS File Exported`, `${title}.xlsx`);
            res.status(200).json({ status: "success", message: "file successfully downloaded", path: `${path}/${title}.xlsx`, });
        });
    } catch (err) {
        console.log('This is the error: ' + err);
    }

});

app.post('/exportToPDF', tokencheck(), (req, res) => {
    let title = req.body.title;
    let columns = [];
    req.body.columns.forEach(column => {
        columns.push(column.header)
    });
    let results = [];
    req.body.results.forEach(res => {
        row = [];
        req.body.columns.forEach(column => {
            row.push(res[column.key])
        });
        results.push(row)
    })

    const doc = new jsPDF('landscape');

    const addFooters = doc => {
        const pageCount = doc.internal.getNumberOfPages()
        console.log(pageCount)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        for (var i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.text(doc.internal.pageSize.width / 2, 200, String(i) + ' / ' + String(pageCount) + '. oldal', {
                align: 'center'
            })
        }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(10, 10, 'Termelés Kezelö Rendszer');
    doc.setFontSize(8);
    doc.text(240, 10, 'Nyomtatás dátuma: ' + moment(new Date()).format('yyyy-MM-DD HH:mm'));
    doc.setFontSize(16);
    doc.text(doc.internal.pageSize.width / 2, 10, title, {
        align: 'center'
    });
    doc.setFontSize(8);
    doc.autoTable({
        head: [
            columns
        ],
        body: results

    });
    addFooters(doc);
    doc.save(`../Public/exports/${title}.pdf`);
    res.status(200).json({ status: "success", message: "file successfully downloaded", path: `${path}/${title}.pdf`, });
});

// ---------------------------------------------------
// ***************   CRUD OPERATIONS   ***************
// ---------------------------------------------------

// GET ALL RECORDS FROM :table
app.get('/:table', tokencheck(), (req, res) => {
    let table = req.params.table;

    pool.query(`SELECT * FROM ${table}`, (err, results) => {
        if (err) {
            log(req.socket.remoteAddress, err, 'error');
            res.status(500).json(err);
        } else {
            log(req.socket.remoteAddress, `${results.length} record(s) sent form ${table} table.`, 'notice');
            res.status(200).json(results);
        }
    });
});

// GET ONE RECORD FROM :table
app.get('/:table/:field/:op/:value', tokencheck(), (req, res) => {
    let table = req.params.table;
    let field = req.params.field;
    let value = req.params.value;
    let op = getOp(req.params.op);

    if (op == ' LIKE ') {
        value = `'%${value}%'`;
    }

    pool.query(`SELECT * FROM ${table} WHERE ${field}${op}?`, [value], (err, results) => {
        if (err) {
            log(req.socket.remoteAddress, err, 'error');
            res.status(500).json(err);
        } else {
            log(req.socket.remoteAddress, `${results.length} record(s) sent form ${table} table.`, 'notice');
            res.status(200).json(results);
        }
    });
});

// INSERT RECORD TO :table
app.post('/:table', (req, res) => {
    let table = req.params.table;
    let data = req.body;

    let fields = 'ID';
    results = Object.keys(data);
    results.forEach(element => {
        fields += ',' + element;
    });

    let str = '';
    results = Object.values(data);

    for (let i = 0; i < results.length; i++) {
        typeof results[i] === 'string' ? results[i] = results[i].replace(/"/g, '\\"') : '';
        typeof results[i] === 'string' ? results[i] = results[i].replace(/\?/g, '&quest;') : '';
        //   str += ',"' + results[i] + '"';
        if (results[i] == null) {
            str += ',' + results[i];
        } else {
            str += ',"' + results[i] + '"';
        }
    }

    pool.query(`INSERT INTO ${table} (${fields}) VALUES(null ${str})`, (err, results) => {
        if (err) {
            log(req.socket.remoteAddress, err, 'error');
            res.status(500).json(err);
        } else {
            log(req.socket.remoteAddress, `${results.affectedRows} record inserted to ${table} table.`, 'notice');
            res.status(200).json(results);
        }
    });
});

// REPLACE RECORD TO :table
app.post('/replace/:table', (req, res) => {
    let table = req.params.table;
    let data = req.body;

    let fields = '';
    results = Object.keys(data);
    results.forEach(element => {
        fields += element + ',';
    });

    fields = fields.slice(0, -1);

    let str = '';
    results = Object.values(data);

    for (let i = 0; i < results.length; i++) {
        typeof results[i] === 'string' ? results[i] = results[i].replace(/"/g, '\\"') : '';
        typeof results[i] === 'string' ? results[i] = results[i].replace(/\?/g, '&quest;') : '';
        str += '"' + results[i] + '",';
        /*  if (results[i] == null) {
              str += fields[i] + '=' + results[i] + ',';
          } else {
              str += fields[i] + '="' + results[i] + '",';
          }*/
    }

    str = str.slice(0, -1);

    pool.query(`REPLACE INTO ${table} (${fields}) VALUES(${str})`, (err, results) => {
        if (err) {
            log(req.socket.remoteAddress, err, 'error');
            res.status(500).json(err);
        } else {
            log(req.socket.remoteAddress, `${results.affectedRows} replaced to ${table} table.`, 'notice');
            res.status(200).json(results);
        }
    });
});

// UPDATE RECORD IN :table BY :field
app.patch('/:table/:field/:op/:value', tokencheck(), (req, res) => {
    let table = req.params.table;
    let field = req.params.field;
    let value = req.params.value;
    let op = getOp(req.params.op);
    let data = req.body;

    if (op == ' LIKE ') {
        value = `'%${value}%'`;
    }

    let str = '';
    fields = Object.keys(data);
    results = Object.values(data);

    for (let i = 0; i < fields.length; i++) {
        typeof results[i] === 'string' ? results[i] = results[i].replace(/"/g, '\\"') : '';
        typeof results[i] === 'string' ? results[i] = results[i].replace(/\?/g, '&quest;') : '';
        if (results[i] == null) {
            str += fields[i] + '=' + results[i] + ',';
        } else {
            str += fields[i] + '="' + results[i] + '",';
        }
    }

    str = str.substring(0, str.length - 1);

    pool.query(`UPDATE ${table} SET ${str} WHERE ${field}${op}?`, [value], (err, results) => {
        if (err) {
            log(req.socket.remoteAddress, err, 'error');
            res.status(500).json(err);
        } else {
            log(req.socket.remoteAddress, `${results.affectedRows} record(s) updated in ${table} table.`, 'notice');
            res.status(200).json(results);
        }
    });
});

// DELETE ALL RECORD FROM :table
app.delete('/:table', tokencheck(), (req, res) => {
    let table = req.params.table;
    pool.query(`DELETE FROM ${table}`, (err, results) => {
        if (err) {
            log(req.socket.remoteAddress, err, 'error');
            res.status(500).json(err);
        } else {
            log(req.socket.remoteAddress, `${results.affectedRows} record deleted form ${table} table.`, 'notice');
            res.status(200).json(results);
        }
    });
});

// DELETE RECORDS FROM :table BY :field
app.delete('/:table/:field/:op/:value', tokencheck(), (req, res) => {
    let table = req.params.table;
    let field = req.params.field;
    let value = req.params.value;
    let op = getOp(req.params.op);

    pool.query(`DELETE FROM ${table} WHERE ${field}${op}?`, [value], (err, results) => {
        if (err) {
            log(req.socket.remoteAddress, err, 'error');
            res.status(500).json(err);
        } else {
            log(req.socket.remoteAddress, `${results.affectedRows} record deleted form ${table} table.`);
            res.status(200).json(results);
        }
    });
});