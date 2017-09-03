const fs = require('fs')
const TelegramBot = require('node-telegram-bot-api')
const admin = require('firebase-admin')
const moment = require('moment')

const config = require('./config.js')
const text = {
    start: fs.readFileSync('./txt/start.txt', { encoding: 'utf8' }),
    help: fs.readFileSync('./txt/help.txt', { encoding: 'utf8' }),
}

// Firebase Setup

admin.initializeApp({
    credential: admin.credential.cert(require(config.SERVICE_ACCOUNT)),
    databaseURL: `https://${config.PROJECT_ID}.firebaseio.com`
})

let db = admin.database()
let billsRef = db.ref('bills')
let tmpBills = {}

billsRef.on('value', snapshot => {
    tmpBills = snapshot.val()
})

// Telegram Bot

const bot = new TelegramBot(config.BOT_TOKEN, { polling: true })

let sendMessage = (user, msg) => {
    bot.sendMessage(user, msg, { parse_mode: 'Markdown' })
}

const botFunctions = {
    start: (userId, args, msg) => {
        let newData = {}
        newData[userId] = { _start: Date.now() }
        billsRef.update(newData)

        let res = text.start
            .replace('#{first_name}', msg.chat.first_name)
            .replace('#{last_name}', msg.chat.last_name)
        sendMessage(userId, res)
    },

    help: (userId, args, msg) => {
        sendMessage(userId, text.help)
    },

    list: (userId, args, msg) => {
        let listPositive = []
        let listNegative = []

        if (tmpBills[userId]) {
            Object.keys(tmpBills[userId])
                .filter(v => v[0] !== '_' && tmpBills[userId][v] !== 0)
                .forEach(v => {
                    if (tmpBills[userId][v] > 0) {
                        listPositive.push({
                            name: v,
                            amount: tmpBills[userId][v]
                        })
                    } else if (tmpBills[userId][v] < 0) {
                        listNegative.push({
                            name: v,
                            amount: -1 * tmpBills[userId][v]
                        })
                    }
                })
        }

        let res = ''

        if (listPositive.length + listNegative.length) {
            let res_listPositive = listPositive.map(v => `${v.name}   ${v.amount} 元`).join('\n')
            let res_listNegative = listNegative.map(v => `${v.name}   ${v.amount} 元`).join('\n')

            res = `清單來囉✩\n\n你欠人家的：\n${res_listNegative}\n\n可以去討的：\n${res_listPositive}`
        } else {
            res = '沒有清單！是個債權關係清廉的朋友呢★\n用 /add 跟 /minus 一起乃建立債權關係吧！'
        }

        sendMessage(userId, res)
    },
    edit: (userId, args, msg, operation) => {
        // add, minus, clear
        if (args.length < 2 || args.length > 3) {
            sendMessage(userId, '指令長度不符合')
            return
        }
        if (args[0] !== '/clear' && ~~args[2] === 0) {
            sendMessage(userId, '偵測到不合法字串')
            return
        }

        let newData = {}
        newData[userId] = tmpBills[userId] // load tmp data

        if (!newData[userId][args[1]]) newData[userId][args[1]] = 0 // prevent undefined number

        if (operation === 'add') {
            newData[userId][args[1]] += ~~args[2]
        } else if (operation === 'minus') {
            newData[userId][args[1]] -= ~~args[2]
        } else if (operation === 'clear') {
            newData[userId][args[1]] = 0
        }

        let res = ''

        if (newData[userId][args[1]] > 0) {
            res = '*ooo* 還有 *xxx* 元沒還你喔～'
        } else if (newData[userId][args[1]] < 0) {
            res = '你欠了 *ooo* *xxx* 元喔！幫你記起來了～'
        } else {
            delete newData[userId][args[1]]
            res = '哇，你跟 *ooo* 已經沒任何瓜葛囉～\n開心吧♪'
        }

        billsRef.update(newData)

        res = res
            .replace('ooo', args[1])
            .replace('xxx', Math.abs(newData[userId][args[1]]))
        sendMessage(userId, res)
    },
    add: (userId, args, msg) => {
        botFunctions.edit.call(null, userId, args, msg, 'add')
    },
    minus: (userId, args, msg) => {
        botFunctions.edit.call(null, userId, args, msg, 'minus')
    },
    clear: (userId, args, msg) => {
        if (args.length !== 2) {
            sendMessage(userId, '指令長度不符合')
            return
        }
        botFunctions.edit.call(null, userId, args, msg, 'clear')
    }
}

// alias

botFunctions['pay'] = botFunctions.add
botFunctions['lend'] = botFunctions.add
botFunctions['borrow'] = botFunctions.minus

// get message from telegram

bot.on('message', msg => {
    if (msg.text[0] === '/') {
        console.log(msg.chat.id, msg.text)
        fs.appendFileSync(`./logs/${moment().format('YYYYMMDD')}.log`, `${Date.now()}: ${msg.chat.id} ${msg.text}\n`) // append log

        let args = msg.text.split(' ')
        let cmd = args[0].substr(1).toLowerCase()

        if (typeof botFunctions[cmd] === 'function') {
            botFunctions[cmd].call(null, msg.chat.id, args, msg)
        } else {
            bot.sendMessage(msg.chat.id, '沒有這個指令喔！')
        }
    }
})

console.log('Bokikun is running . . . ')
