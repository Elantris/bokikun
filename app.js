const fs = require('fs')
const TelegramBot = require('node-telegram-bot-api')
const admin = require('firebase-admin')

const config = require('./config.js')

admin.initializeApp({
    credential: admin.credential.cert(require(config.SERVICE_ACCOUNT)),
    databaseURL: `https://${config.PROJECT_ID}.firebaseio.com`
})

let db = admin.database()
let billsRef = db.ref('bills')
let historyRef = db.ref('history')
let tmp_bills = {}
billsRef.on('value', snapshot => {
    tmp_bills = snapshot.val()
    console.log(JSON.stringify(tmp_bills))
})

let text = {
    start: fs.readFileSync('./txt/start.md', { encoding: 'utf8' }),
    help: fs.readFileSync('./txt/help.md', { encoding: 'utf8' })
}

const bot = new TelegramBot(config.BOT_TOKEN, { polling: true })

const botFunctions = {
    start: (msg, args) => {
        let res = text.start.replace('#{first_name}', msg.chat.first_name).replace('#{last_name}', msg.chat.last_name)
        bot.sendMessage(msg.chat.id, res, { parse_mode: 'Markdown' })

        let tmp_data = {}
        tmp_data[msg.chat.id] = {
            _start: Date.now()
        }
        billsRef.update(tmp_data)
    },
    help: (msg, args) => {
        bot.sendMessage(msg.chat.id, text.help, { parse_mode: 'Markdown' })
    },
    list: (msg, args) => {
        let res = ''
        let res_add = ''
        let res_minus = ''

        if (tmp_bills[msg.chat.id]) {
            for (let i in tmp_bills[msg.chat.id]) {
                if (i[0] !== '_') {
                    let amount = tmp_bills[msg.chat.id][i]
                    if (amount > 0) {
                        res_add += `\n${i} ▏${amount} 元`
                    } else if (amount < 0) {
                        res_minus += `\n${i} ▏${-1 * amount} 元`
                    }
                }
            }
        }

        if (res_add.length || res_minus.length) {
            if (!res_add.length) {
                res_add = '\nnone！'
            }
            if (!res_minus.length) {
                res_minus = '\nnone！'
            }
            res = `清單來囉✩\n\n*你欠人家的：*${res_minus}\n\n*可以去討的：*${res_add}`
        } else {
            res = '清單ㄌㄞ⋯沒有清單！是個債權關係清廉的朋友呢★\n用 /add 跟 /minus 一起乃建立債權關係吧！'
        }

        bot.sendMessage(msg.chat.id, res, { parse_mode: 'Markdown' })
    },
    add: (msg, args) => {
        if (args.length < 3 || ~~args[2] === 0) {
            bot.sendMessage(msg.chat.id, '偵測到不合法字串', { parse_mode: 'Markdown' })
            return
        }

        let tmp_data = {}
        if (tmp_bills[msg.chat.id] && tmp_bills[msg.chat.id][args[1]]) {
            tmp_data[args[1]] = ~~tmp_bills[msg.chat.id][args[1]]
        } else {
            tmp_data[args[1]] = 0
        }
        if (args[0] === '/add') tmp_data[args[1]] += ~~args[2]
        else tmp_data[args[1]] -= ~~args[2]

        billsRef.child(msg.chat.id).update(tmp_data)

        let res = ''
        const res0 = '哇，你跟 *ooo* 已經沒任何瓜葛囉～\n開心吧♪'
        const res1 = '*ooo* 還有 *xxx* 元沒還你喔～'
        const res2 = '你欠了 *ooo* *xxx* 元喔！幫你記起來了～'

        if (tmp_data[args[1]] === 0) {
            res = res0
        } else if (tmp_data[args[1]] > 0) {
            res = res1
        } else {
            res = res2
        }

        res = res.replace('ooo', args[1]).replace('xxx', Math.abs(tmp_data[args[1]]))

        bot.sendMessage(msg.chat.id, res, { parse_mode: 'Markdown' })
    },
    minus: (msg, args) => {
        botFunctions.add.call(null, msg, args)
    },
    clear: (msg, args) => {
        if (args.length < 2) {
            bot.sendMessage(msg.chat.id, '偵測到不合法字串', { parse_mode: 'Markdown' })
            return
        }

        let tmp_data = {}
        tmp_data[args[1]] = 0
        billsRef.child(msg.chat.id).update(tmp_data)
        let res = '哇，你跟 *ooo* 已經沒任何瓜葛囉～\n開心吧♪'.replace('ooo', args[1])
        bot.sendMessage(msg.chat.id, res, { parse_mode: 'Markdown' })
    },
}

bot.on('message', msg => {
    if (msg.text[0] === '/') {
        console.log(msg.chat.id, msg.text)

        let args = msg.text.split(' ')
        let cmd = args[0].substr(1)

        if (typeof botFunctions[cmd] === 'function') {
            botFunctions[cmd].call(null, msg, args)
        } else {
            bot.sendMessage(msg.chat.id, '沒有這個指令喔！')
        }
    }
})

console.log('Bokikun is running . . . ')
