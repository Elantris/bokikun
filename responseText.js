const fs = require('fs')

/* terms:
 - first_name
 - last_name
 - list_negative
 - list_positive
 - person
 - amount
*/

let readfile = (filename) => {
    return fs.readFileSync(`./txt/${filename}.txt`, { encoding: 'utf8' })
}

module.exports = {
    tw: {
        // default commands
        start: [
            readfile('start')
        ],
        help: [
            readfile('help')
        ],
        warning_start: [
            '要先輸入 /start 才能開始紀錄啦！'
        ],

        // list transactions

        list_normal: [
            readfile('list_normal')
        ],
        list_none: [
            '沒有清單！是個債權關係清廉的朋友呢★\n用 /add 跟 /minus 一起乃建立債權關係吧！'
        ],

        credit_positive: [
            '{{person}} 還有 {{amount}} 元沒還你喔～'
        ],
        credit_negative: [
            '你欠了 {{person}} {{amount}} 元喔！幫你記起來了～'
        ],
        credit_none: [
            '哇，你跟 {{person}} 已經沒任何瓜葛囉～\n開心吧♪'
        ],

        // error
        no_command: [
            '沒有這個指令喔！'
        ],
        too_less_arguments: [
            '指令參數不完全'
        ],
        too_more_arguments: [
            '指令參數太多了！'
        ],
        no_relation_with: [
            '你原本就和 {{person}} 沒有債務關係喔～'
        ],
        no_zero_amount: [
            '金額不可為零'
        ],

        // other chats

        chat: [
            '刷啦啦啦啦'
        ],
    }
}
