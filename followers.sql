DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_profiles;

CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    firstname VARCHAR(255) NOT NULL,
    lastname VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE CHECK(email <> ''),
    pass VARCHAR(255) NOT NULL
);

CREATE TABLE signatures(
    id SERIAL PRIMARY KEY,
    sig TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id)
);


CREATE TABLE user_profiles(
    id SERIAL PRIMARY KEY,
    age INTEGER,
    city VARCHAR(100),
    url VARCHAR(300),
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id)
);
