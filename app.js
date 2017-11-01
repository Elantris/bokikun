const fs = require('fs')
const TelegramBot = require('node-telegram-bot-api')
const admin = require('firebase-admin')
const moment = require('moment')

// custom modules

const config = require('./config')
const responseText = require('./responseText')

// Firebase Setup

admin.initializeApp({
    credential: admin.credential.cert(require(config.SERVICE_ACCOUNT)),
    databaseURL: `https://${config.PROJECT_ID}.firebaseio.com`
})

let billsRef = admin.database().ref('bills')
let bills = {}
let dbInit = false

billsRef.on('value', snapshot => {
    bills = snapshot.val()
    if (!dbInit) {
        console.log('Database is connected.')
        dbInit = true
    }

})

// Telegram Bot

const bot = new TelegramBot(config.BOT_TOKEN, { polling: true })
let lang = 'tw'

let sendMessage = (userId, type, options = {}) => {
    let terms = [
        'first_name',
        'last_name',
        'list_negative',
        'list_positive',
        'person',
        'amount'
    ]

    let response = responseText[lang][type] || ''
    if (typeof response === 'object') {
        response = response[~~(Math.random() * response.length)].trim()
    }
    terms.filter(v => options[v]).forEach(v => {
        response = response.replace(`{{${v}}}`, options[v])
    })

    let newLog = `${Date.now()}: RES ${userId} ${JSON.stringify(response)}`
    console.log(newLog)
    fs.appendFileSync(`./logs/${moment().format('YYYYMMDD')}.log`, newLog + '\n') // append origin text to log

    bot.sendMessage(userId, response, { parse_mode: 'Markdown' })
}

let newTransaction = (userId, args) => {
    let command = args[0]
    let limitLength = (command === 'clear' ? 2 : 3)

    if (args.length < limitLength) {
        sendMessage(userId, 'too_less_arguments')
        return
    }
    let person = args[1]
    let amount = ~~(args[2] || 0)

    if (command === 'clear' && !bills[userId][person]) {
        sendMessage(userId, 'no_relation_with', { person })
        return
    }
    if (command !== 'clear' && amount === 0) {
        sendMessage(userId, 'no_zero_amount')
        return
    }

    if (command === 'minus') {
        amount *= -1
    } else if (command === 'clear') {
        amount = -1 * bills[userId][person]
    }

    let newData = {}
    newData[userId] = bills[userId] // load tmp data

    if (!newData[userId][person]) {
        newData[userId][person] = 0 // prevent undefined amount
    }
    newData[userId][person] += amount

    let credit = newData[userId][person]
    let result = ''

    if (credit > 0) {
        result = 'credit_positive'
    } else if (credit < 0) {
        result = 'credit_negative'
    } else {
        delete newData[userId][person]
        result = 'credit_none'
    }

    billsRef.update(newData)
    sendMessage(userId, result, {
        person,
        amount: Math.abs(credit)
    })
}

// bot commands

const botFunctions = {
    start: (userId, args, msg) => {
        let newData = {}
        newData[userId] = { _start: Date.now() }
        billsRef.update(newData)

        sendMessage(userId, 'start', {
            first_name: msg.chat.first_name || '',
            last_name: msg.chat.last_name || ''
        })
    },

    help: (userId, args, msg) => {
        sendMessage(userId, 'help')
    },

    list: (userId, args, msg) => {
        let listPositive = []
        let listNegative = []

        if (bills[userId]) {
            Object.keys(bills[userId])
                .filter(v => v[0] !== '_' && bills[userId][v] !== 0)
                .forEach(v => {
                    if (bills[userId][v] > 0) {
                        listPositive.push({
                            name: v,
                            amount: bills[userId][v]
                        })
                    } else if (bills[userId][v] < 0) {
                        listNegative.push({
                            name: v,
                            amount: -1 * bills[userId][v]
                        })
                    }
                })
        }

        if (listPositive.length + listNegative.length) {
            let res_listPositive = listPositive.map(v => `${v.name}   ${v.amount} 元`).join('\n')
            let res_listNegative = listNegative.map(v => `${v.name}   ${v.amount} 元`).join('\n')

            sendMessage(userId, 'list_normal', {
                'list_negative': res_listNegative,
                'list_positive': res_listPositive
            })
        } else {
            sendMessage(userId, 'list_none')
        }
    },
    add: (userId, args, msg) => {
        args[0] = 'add'
        newTransaction(userId, args)
    },
    minus: (userId, args, msg) => {
        args[0] = 'minus'
        newTransaction(userId, args)
    },
    clear: (userId, args, msg) => {
        args[0] = 'clear'
        newTransaction(userId, args)
    }
}

// alias

botFunctions['pay'] = botFunctions.add
botFunctions['lend'] = botFunctions.add
botFunctions['borrow'] = botFunctions.minus
botFunctions['take'] = botFunctions.minus

// get message from telegram

bot.on('message', msg => {
    if (msg.text[0] === '/') { // message start with '/'
        let newLog = `${Date.now()}: GET ${msg.chat.id} ${JSON.stringify(msg.text)}`
        console.log(newLog)
        fs.appendFileSync(`./logs/${moment().format('YYYYMMDD')}.log`, newLog + '\n') // append origin text to log

        let args = msg.text.split(' ')
        let cmd = args[0].substr(1).toLowerCase()

        if (typeof botFunctions[cmd] === 'function') {
            if (cmd !== 'start' && !bills[msg.chat.id]) {
                sendMessage(msg.chat.id, 'warning_start')
                return
            }
            botFunctions[cmd].call(null, msg.chat.id, args, msg)
        } else {
            sendMessage(msg.chat.id, 'no_command')
        }
    } else {
        sendMessage(msg.chat.id, 'chat')
    }
})

console.log('Bokikun is running . . . ')
