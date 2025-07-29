# AGOT Proxy

This project is a fork of [Proxy Nexus](https://github.com/axmccx/proxynexus).  Thanks very much to Alex McCulloch and his work on that project, which enabled this one.

The goal of this project is for folks to quickly generate proxies to play A Game of Thrones Card Game, Second Edition.

## Hacking On This Project

### Prerequisites

- Node
- Redis
- Postgres

### Local Development Setup

Note that I develop on MacOS, so these instructions are specific to that.

- Run `npm i` to install all of the package dependencies
- Run `redis-server /opt/homebrew/etc/redis.conf` to start a Redis server locally
  - Assumes a homebrew-installed Redis, YMMV
- Ensure postgres is running, create a database there for local development
- Fill out `database/config` with your local database details
- Run `npx sequelize-cli db:migrate` to create the needed tables in the database
- Run `npx sequelize-cli db:seed:all` to seed the database
- Run `npm start`

If all goes well, you should see the app being served by pointing your browser at `http://localhost:3000/`.