const express = require("express");
const app = express();
const bodyParser = require("body-parser");
// const cookieParser = require("cookie-parser");
//const fs = require("fs");
//var basicAuth = require("basic-auth");
const ca = require("chalk-animation");
const db = require("./db");
// const button = $("#button"); ///??????????????????????????
var cookieSession = require("cookie-session");
const csurf = require("csurf");

const { hash, compare } = require("./bcrypt");

app.disable("x-powered-by");

app.use(
    bodyParser.urlencoded({
        extended: false
    })
);

app.use(express.static("./public"));

// setup middleware to parse cookies
app.use(
    cookieSession({
        secret: `I'm always angry.`,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);

app.use(csurf());

app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
});

//do not touch this code
var hb = require("express-handlebars");
app.engine("handlebars", hb());
app.set("view engine", "handlebars");
//do not touch this code
///
//Redirecting user if he/she not logget in
app.use(function(req, res, next) {
    if (!req.session.userId && req.url != "/register" && req.url != "/login") {
        res.redirect("/login");
    } else {
        next();
    }
});

app.get("/", (req, res) => {
    res.redirect("/register");
    // console.log("this is req.session: ", req.session);
});

app.get("/register", (req, res) => {
    if (req.session.userId) {
        res.redirect("/profile");
    }
    res.render("register", {
        layout: "main"
    });
});

app.post("/register", (req, res) => {
    const { firstname, lastname, email, pass } = req.body;
    hash(pass)
        .then(hash => {
            return db.createUser(firstname, lastname, email, hash);
        })
        .then(results => {
            req.session.userId = results.rows[0].id;
            req.session.firstname = results.rows[0].firstname;
            req.session.lastname = results.rows[0].lastname;
            req.session.email = results.rows[0].email;
            res.redirect("/profile");
        })
        .catch(err => {
            // console.log("Error in POST /register: ", err);
            res.render("register", {
                layout: "main",
                err: "err"
            });
        });
});

app.get("/profile", (req, res) => {
    res.render("profile", {
        layout: "main",
        err: "err"
    });
});

app.post("/profile", (req, res) => {
    return db
        .createUserProfiles(
            req.body.age,
            req.body.city,
            req.body.url,
            req.session.userId
        )
        .then(() => {
            res.redirect("/petition");
        })
        .catch(err => {
            // console.log(err);
            res.render("petition", {
                layout: "main",
                err: err
            });
        });
});

app.get("/login", (req, res) => {
    if (!req.session.userId) {
        res.render("login", {
            layout: "main"
        });
    } else {
        res.redirect("/petition");
    }
});

// var popup = require("popups");
var alert = require("alert-node");

app.post("/login", (req, res) => {
    db.getUser(req.body.email)
        .then(result => {
            compare(req.body.pass, result.rows[0].pass)
                .then(doesMatch => {
                    if (doesMatch === true) {
                        req.session.userId = result.rows[0].userId;
                        req.session.signaturesId = result.rows[0].signaturesId;

                        //console.log(result.rows[0].sig);
                    } else {
                        // console.log("Wrong password, please try again");
                        alert("Wrong password, please try again");
                    }
                })
                .then(() => {
                    if (req.session.signaturesId == null) {
                        res.redirect("/petition");
                    } else {
                        res.redirect("/thanks");
                    }
                });
        })
        .catch(err => {
            console.log("error in login: ", err);
            res.render("login", {
                layout: "main",
                err: "The user doesn't exist. Please, register first!"
            });
        });
});

app.get("/petition", (req, res) => {
    if (req.session.signaturesId) {
        res.redirect("/thanks");
        return;
    } else {
        res.render("petition", {
            layout: "main"
        });
    }
});

app.post("/petition", (req, res) => {
    // console.log("This is from index: ", req.body);
    db.saveSigners(req.body.sig, req.session.userId)
        .then(results => {
            // console.log("Results.rows[0].id is: ", results.rows[0].id);
            req.session.signaturesId = results.rows[0].id;
            res.redirect("/thanks");
        })
        .catch(function(err) {
            res.render("petition", {
                layout: "main",
                err: "err"
            });
        });
});

app.get("/thanks", (req, res) => {
    // console.log("req session in thanks: ", req.session);
    // console.log(req.session);
    if (!req.session.signaturesId) {
        res.redirect("/petition");
    } else {
        const id = req.session.signaturesId;
        // console.log("This is id: ", req.session.signatureId);
        Promise.all([db.getSignature(id), db.countSigners()])
            .then(results => {
                const count = results[1].rows[0].count;
                let text;
                count < 2 ? (text = "supporter") : (text = "supporters");
                res.render("thanks", {
                    layout: "main",
                    title: "Thank you",
                    logout: "yes",
                    link: "yes",
                    base64str: results[0].rows[0].sig,
                    count: count,
                    text: `Have a look at ${count} ${text} so far.`
                });
            })
            .catch(err => console.log("Error in GET /thanks: ", err));
    }
});

app.get("/signers", (req, res) => {
    if (!req.session.signaturesId) {
        res.redirect("/petition");
    } else {
        Promise.all([db.getSigners(), db.countSigners()])
            .then(function(results) {
                let text;
                results[1].rows[0].count < 2
                    ? (text = "person has signed so far:")
                    : (text = "people have signed so far:");
                res.render("signers", {
                    layout: "main",
                    logout: "yes",
                    text: `${results[1].rows[0].count} ${text}`,
                    signers: results[0].rows //keep in touch
                });
            })
            .catch(err => console.log("Error in GET /signers: ", err));
    }
});

app.get("/signers/:city", (req, res) => {
    const city = req.params.city;
    Promise.all([db.getSigners(city), db.countSigners(city)])
        .then(function(results) {
            let text;
            results[1].rows[0].count < 2
                ? (text = `person from ${city} has signed so far:`)
                : (text = `people from ${city} have signed so far:`);
            res.render("signers", {
                layout: "main",
                title: "Signers",
                logout: "yes",
                text: `${results[1].rows[0].count} ${text}`,
                signers: results[0].rows, //keep in touch
                link: "yes"
            });
        })
        .catch(err => console.log(`Error in GET /signers/${city} `, err));
});

app.get("/profile/edit", (req, res) => {
    db.editProfile(req.session.userId)
        .then(results => {
            res.render("editprofile", {
                layout: "main",
                // results: results.rows[0],
                profile: results.rows[0]
            });
        })
        .catch(function(error) {
            console.log("error editing profile:", error);
        });
});

app.post("/profile/edit", (req, res) => {
    let promises;
    if (req.body.pass != "") {
        promises = [
            hash(req.body.pass).then(hash =>
                db.updateUser(
                    req.session.userId,
                    req.body.firstname,
                    req.body.lastname,
                    req.body.email,
                    hash
                )
            ),
            db.updateProfile(
                req.body.age,
                req.body.city,
                req.body.url,
                req.session.userId
            )
        ];
    } else {
        promises = [
            db.updateUser(
                req.session.userId,
                req.body.firstname,
                req.body.lastname,
                req.body.email
            ),
            db.updateProfile(
                req.body.age,
                req.body.city,
                req.body.url,
                req.session.userId
            )
        ];
    }

    Promise.all(promises)
        .then(() => {
            res.redirect("/petition");
        })
        .catch(function(error) {
            console.log("error:", error);
        });
});

app.post("/signature/delete", (req, res) => {
    db.deleteSignatures(req.session.signaturesId)
        .then(function() {
            delete req.session.signaturesId; //req.session.signaturesId = null;
            res.redirect("/petition");
        })
        .catch(function(error) {
            console.log("error deleting signature:", error);
        });
});

app.post("/profile/delete", (req, res) => {
    Promise.all([
        db.deleteSignatures(req.session.signaturesId),
        db.deleteProfile(req.session.userId)
    ])
        .then(function() {
            delete req.session.signaturesId; //req.session.signaturesId = null;
            return db.deleteUser(req.session.userId);
        })
        .then(function() {
            delete req.session.userId;
            res.redirect("/login");
        })
        .catch(err => {
            console.log("Error ", err);
        });
});

app.get("/logout", function(req, res) {
    req.session = null;
    res.redirect("/login");
});

app.get("*", (req, res) => {
    res.redirect("/petition");
});

app.use(function(req, res, next) {
    res.setHeader("X-Frame-Options", "DENY");
    next();
});

app.listen(process.env.PORT || 8080, () => ca.rainbow("I am listening ..."));
