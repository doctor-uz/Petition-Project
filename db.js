const spicedPg = require("spiced-pg");

const db = spicedPg("postgres:dbUser:password@localhost:5432/cities");

db.query("SELECT * FROM cities") //RETURNING *
    .then(function(results) {
        console.log(results.rows);
    })
    .catch(function(err) {
        console.log(err);
    });
