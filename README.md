# TofuMart

This is a beautiful bot that is built in the equally beautiful language of TypeScript.

Commands are added under the `src/commands` directory. The `src/index.ts` file is the entry point for the bot.

Commands themselves are added as classes that extend the `SlashCommand` class. Custom decorators were implemented to 
add functionality to commands, such as max concurrency or a cooldown.

## Getting Started
You'll need a `.env` file with the following variables:
```
TOKEN=your-bot-token
TEST_TOKEN=your-test-token
PG_USER=your-db-user
PG_HOST=your-db-host
PG_DB=your-db-name
PG_PASSWORD=your-db-password
```

This bot uses a Postgres database to store data. You can find the TS schema in `src/db/tables.ts`.
(You'll have to do some guesswork to figure out the SQL schema, sorry!)

## Running the bot
To run the bot, you'll need to have Node.js installed. Then, run `npm install` to install the dependencies.

To run the bot, run `npm run start`.

## Commands

### Auction
* `/auction` - Shows the list of auctions currently being held

* `/bid` - Bids on an auction

### Market
* `/market` - Shows the list of cards currently being sold

* `/buy` - Buys a card from the market

### General
* `/help` - Shows you the available commands

* `/claim` - Claims the most recently purchased/won card

`/exchange` - Initiates an exchange with the bot to trade currencies

* `/queue` - View the queue for the auctions/market

* `/use` - Use a Key/Slot to add your card to a queue

### Admin
To be considered an admin, add your Discord ID to the `admins` field in `src/config.yml`.
* `/add` - Add currency to the specified user
* `/addAuctionTime` - Add time to the specified auction
* `/addMarketTime` - Add time to the current market rotation
* `/disable` - Disable a command
* `/enable` - Enable a command
* `/image` - Rebuild the auction images
* `/shutdown` - Shutdown the bot

## Contributing
If you want to contribute to this project, please make a pull request. I'll review it and merge it if it's good.
