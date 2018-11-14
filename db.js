var spicedPg = require("spiced-pg");

var db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:postgres@localhost:5432/petition"
);

exports.getSigners = () => {
    return db.query("SELECT * FROM signatures");
};

exports.saveSigners = (sig, user_id) => {
    return db.query(
        `INSERT INTO signatures (sig, user_id)
        VALUES ($1, $2)
        RETURNING id`,
        [sig || null, user_id || null]
    );
};

exports.getSigners = city => {
    if (city) {
        return db.query(
            `SELECT u.firstname AS firstname, u.lastname AS lastname, p.age AS age, p.url AS url
            FROM signatures AS s
            LEFT JOIN users AS u
            ON s.user_id = u.id
            LEFT JOIN user_profiles AS p
            ON s.user_id = p.user_id
            WHERE LOWER(p.city) = LOWER($1)`,
            [city || null]
        );
    } else {
        return db.query(
            `SELECT u.firstname AS firstname, u.lastname AS lastname, p.age AS age, p.city AS city, p.url AS url
            FROM signatures AS s
            LEFT JOIN users AS u
            ON s.user_id = u.id
            LEFT JOIN user_profiles AS p
            ON s.user_id = p.user_id`
        );
    }
};

exports.createUser = (firstname, lastname, email, pass) => {
    return db.query(
        `INSERT INTO users (firstname, lastname, email, pass)
        VALUES ($1, $2, $3, $4)
        RETURNING id, firstname, lastname`,
        [firstname || null, lastname || null, email || null, pass || null]
    );
};

exports.getUser = email => {
    return db.query(
        `SELECT users.id AS "userId", users.pass, signatures.id AS "signaturesId"
        FROM users
        LEFT JOIN signatures ON users.id = signatures.user_id
        WHERE users.email = $1`,
        [email]
    );
};

exports.createUserProfiles = (age, city, url, user_id) => {
    return db.query(
        `INSERT INTO user_profiles (age, city, url, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [age || null, city, url, user_id]
    );
};

//JOIN

exports.countSigners = city => {
    if (city) {
        return db.query(
            `SELECT COUNT(s.id)
            FROM signatures AS s
            LEFT JOIN user_profiles AS p
            ON s.user_id = p.user_id
            WHERE LOWER(p.city) = LOWER($1)`,
            [city]
        );
    } else {
        return db.query("SELECT COUNT(id) FROM signatures");
    }
};

exports.getSignature = function(id) {
    return db.query(`SELECT sig FROM signatures WHERE id = $1`, [id]);
};

exports.getForm = id => {
    return db.query(
        `SELECT users.firstname, users.lastname, users.email, users.pass, up.age, up.city, up.url
        FROM users
        LEFT JOIN user_profiles AS up
        ON users.id = up.user_id
        WHERE users.id = $1`,
        [id]
    );
};

//upsert (update/insert):
exports.updateProfile = function(age, city, url, user_id) {
    return db.query(
        `INSERT INTO user_profiles (age, city, url, user_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id)
    DO UPDATE SET age = $1, city = $2, url = $3
    RETURNING id`,
        [age || null, city || null, url || null, user_id || null]
    );
};

//update
exports.updateUser = function(user_id, firstname, lastname, email, pass) {
    if (pass) {
        return db.query(
            `UPDATE users
            SET firstname = $2, lastname = $3, email = $4, pass = $5
            WHERE id = $1`,
            [
                user_id,
                firstname || null,
                lastname || null,
                email || null,
                pass || null
            ]
        );
    } else {
        return db.query(
            `UPDATE users
            SET firstname = $2, lastname = $3, email = $4
            WHERE id = $1`,
            [user_id, firstname || null, lastname || null, email || null]
        );
    }
};

exports.editProfile = input => {
    return db.query(
        `SELECT firstname, lastname, age, email, city, url
        FROM users
        LEFT JOIN user_profiles
        ON user_profiles.user_id = users.id
        WHERE user_id = $1`,
        [input || null]
    );
};

exports.deleteSignatures = function(id) {
    return db.query(`DELETE FROM signatures WHERE user_id = $1`, [id]);
};

exports.deleteProfile = function(id) {
    return db.query(`DELETE FROM user_profiles WHERE user_id = $1`, [id]);
};

exports.deleteUser = function(id) {
    return db.query(`DELETE FROM users WHERE id = $1`, [id]);
};
