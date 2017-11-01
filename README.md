# Bokikun 簿記君
A Telegram bot for recording where your money go with other people.

## Getting Started
Click https://telegram.me/bokikun_bot and chat with Bokikun.

### Commands
- `/list` - 列出所有債權關係
- `/add` name amount - 借錢給別人、別人欠你錢
- `/minus` name amount - 跟別人借錢、你欠別人錢
- `/clear` name - 清除跟這個人的債權關係
- `/start` - 重新設定並清除所有紀錄

## Development

### Prerequisites
- Node.js (v8 or up)
- npm (v5 or up)

### Installing
```
git clone https://github.com/Elantris/bokikun.git
cd bokikun
npm i
```

### Configuration
1. Copy `./config.js.example` to `./config.js`.
2. Create Telegram Bot and get the `BOT_TOKEN` from [@BotFather](https://telegram.me/BotFather).
3. Create Firebase project and get the `PROJECT_ID` and the `SERVICE_ACCOUNT` in json format. [More details](https://firebase.google.com/docs/admin/setup?authuser=0).

## Deployment
[PM2](https://github.com/Unitech/pm2) or other process managers are recommended.
```
pm2 start app.js --name="bokikun"
```

## Built With
- [Firebase Admin Node.js SDK](https://github.com/firebase/firebase-admin-node)
- [Moment.js](http://momentjs.com)
- [Telegram Bot API for NodeJS](https://github.com/yagop/node-telegram-bot-api)

## License
This project is licensed under the MIT License - see the LICENSE file for details.
