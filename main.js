const fs = require('fs')
const path = require('path')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))
const cheerio = require('cheerio')
const cron = require('node-cron')
const {FormData} = require('formdata-node')
const tough = require('tough-cookie')

let config
try {
    const configPath = path.join(process.cwd(), 'config.json')
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
} catch (error) {
    console.error('無法讀取 config.json 文件，請確保文件存在於程序同目錄下')
    console.error('錯誤信息:', error.message)
    process.exit(1)
}

let formhash = ''
const cookies = []

function updateCookies(response) {
    const rawCookies = response.headers.raw()['set-cookie']
    if (rawCookies) {
        rawCookies.forEach(cookie => {
            if (!cookies.includes(cookie)) {
                cookies.push(cookie)
            }
        })
    }
}

function getHeaders() {
    return {
        'Cookie': cookies.join('; '),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
}

function getFormhash() {
    return fetch('https://lineage45.com/member.php?mod=logging&action=login', {
        headers: getHeaders()
    })
        .then(response => {
            updateCookies(response)
            return response.text()
        })
        .then(body => {
            const $ = cheerio.load(body)
            formhash = $('input[name="formhash"]').first().attr('value')
            console.log('獲取到的登錄頁 formhash:', formhash)
            return formhash
        })
}

function login() {
    const formData = new FormData()
    formData.append('formhash', formhash)
    formData.append('referer', 'https://lineage45.com/./')
    formData.append('loginfield', 'username')
    formData.append('username', config.username)
    formData.append('password', config.password)
    formData.append('questionid', '0')
    formData.append('answer', '')

    return fetch('https://lineage45.com/member.php?mod=logging&action=login&loginsubmit=yes&loginhash=Lp4Sq&inajax=1', {
        method: 'POST',
        body: formData,
        headers: {
            ...getHeaders()
        }
    })
        .then(response => {
            updateCookies(response)
            return response.text()
        })
        .then(body => {
            console.log(body)
            console.log('登錄成功')
            return body
        })
}

function getThreadFormhash() {
    return fetch(`https://lineage45.com/forum.php?mod=forumdisplay&fid=49&page=1`, {
        headers: getHeaders()
    })
        .then(response => {
            updateCookies(response)
            return response.text()
        })
        .then(body => {
            const $ = cheerio.load(body)
            formhash = $('input[name="formhash"]').first().attr('value')
            console.log('獲取到的 formhash:', formhash)
            return formhash
        })
}

function postReply() {
    const currentTime = Math.floor(new Date().getTime() / 1000)
    const formData = new FormData()
    formData.append('typeid', '11')
    formData.append('subject', '每日搖一搖')
    formData.append('message', '每日搖一搖')
    formData.append('posttime', currentTime.toString())
    formData.append('formhash', formhash)
    formData.append('usesig', '1')
    formData.append('file', '')

    return fetch(`https://lineage45.com/forum.php?mod=post&action=newthread&fid=49&topicsubmit=yes&infloat=yes&handlekey=fastnewpost&inajax=1`, {
        method: 'POST',
        body: formData,
        headers: {
            ...getHeaders()
        }
    })
        .then(response => {
            updateCookies(response)
            return response.text()
        })
        .then(body => {
            console.log(body)
            console.log('發帖成功')
            return body
        })
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function multiPost(times, intervalSeconds = 30) {
    console.log(`開始發帖，計劃發送 ${times} 個帖子，間隔 ${intervalSeconds} 秒`)
    
    for (let i = 0; i < times; i++) {
        try {
            await postReply()
            console.log(`已發送第 ${i + 1}/${times} 個帖子`)
            
            if (i < times - 1) {
                console.log(`等待 ${intervalSeconds} 秒後發送下一個...`)
                await delay(intervalSeconds * 1000)
            }
        } catch (error) {
            console.error(`第 ${i + 1} 次發帖失敗:`, error)
        }
    }
    
    console.log('所有帖子發送完成')
}

function getLotteryFormhash() {
    return fetch('https://lineage45.com/plugin.php?id=yinxingfei_zzza:yinxingfei_zzza_hall', {
        headers: getHeaders()
    })
        .then(response => {
            updateCookies(response)
            return response.text()
        })
        .then(body => {
            const $ = cheerio.load(body)
            formhash = $('input[name="formhash"]').first().attr('value')
            console.log('獲取到的抽獎頁 formhash:', formhash)
            return formhash
        })
}

function doLottery() {
    const formData = new FormData()
    formData.append('formhash', formhash)

    return fetch('https://lineage45.com/plugin.php?id=yinxingfei_zzza:yinxingfei_zzza_post', {
        method: 'POST',
        body: formData,
        headers: {
            ...getHeaders()
        }
    })
        .then(response => {
            updateCookies(response)
            return response.text()
        })
        .then(body => {
            console.log('完成抽奖')
            return body
        })
}

async function doLogin(postTimes = 1, intervalSeconds = 30) {
    if (+postTimes > 3) {
        console.error('配置錯誤：發帖數量設定超過3')
        return
    }
    try {
        await getFormhash()
        await login()
        await getThreadFormhash()
        await multiPost(postTimes, intervalSeconds)
        await getLotteryFormhash()
        await doLottery()
    } catch (error) {
        console.error('操作過程出錯:', error)
    }
}

if (config.cron) {
    console.log('當前為定時模式：')
    cron.schedule(config.cron, () => {
        doLogin(1, 35)
    })
} else {
    console.log('當前為手動模式：')
    doLogin(1, 35)
}
