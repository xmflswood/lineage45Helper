const request = require('request')
const cheerio = require('cheerio')
const config = require('./config.json')

// 创建一个带有 cookie 管理的 request 实例
const req = request.defaults({ jar: true })

let formhash = ''

// 获取登录页面并提取 formhash
function getFormhash() {
    return new Promise((resolve, reject) => {
        req.get('https://lineage45.com/member.php?mod=logging&action=login', (error, response, body) => {
            if (error) {
                reject(error)
                return
            }

            try {
                const $ = cheerio.load(body)
                formhash = $('input[name="formhash"]').first().attr('value')
                console.log('獲取到的登錄頁 formhash:', formhash)
                resolve(formhash)
            } catch (err) {
                reject(err)
            }
        })
    })
}

// 登录函数
function login() {
    const formData = {
        formhash: formhash,
        referer: 'https://lineage45.com/./',
        loginfield: 'username',
        username: config.username,
        password: config.password,
        questionid: '0',
        answer: ''
    }

    return new Promise((resolve, reject) => {
        req.post({
            url: 'https://lineage45.com/member.php?mod=logging&action=login&loginsubmit=yes&loginhash=Lp4Sq&inajax=1',
            formData: formData,
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }, (error, response, body) => {
            if (error) {
                reject(error)
                return
            }
            console.log('登錄成功')
            resolve(body)
        })
    })
}

// 获取帖子页面的 formhash
function getThreadFormhash() {
    return new Promise((resolve, reject) => {
        req.get(`https://lineage45.com/thread-${config.tid}-1-1.html`, (error, response, body) => {
            if (error) {
                reject(error)
                return
            }

            try {
                const $ = cheerio.load(body)
                formhash = $('input[name="formhash"]').first().attr('value')
                console.log('獲取到的帖子頁 formhash:', formhash)
                resolve(formhash)
            } catch (err) {
                reject(err)
            }
        })
    })
}

// 发帖函数
function postReply() {
    const currentTime = Math.floor(new Date().getTime() / 1000) // 获取当前时间戳（秒）

    const formData = {
        file: '',
        message: config.msg,
        posttime: currentTime,
        formhash: formhash,
        usesig: 1,
        subject: ''
    }

    return new Promise((resolve, reject) => {
        req.post({
            url: `https://lineage45.com/forum.php?mod=post&action=reply&fid=100&tid=${config.tid}&extra=page%3D1&replysubmit=yes&infloat=yes&handlekey=fastpost&inajax=1`,
            formData: formData,
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }, (error, response, body) => {
            if (error) {
                reject(error)
                return
            }
            console.log('發帖成功')
            resolve(body)
        })
    })
}

// 延时函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// 多次发帖函数
async function multiPost(times, intervalSeconds = 30) {
    console.log(`開始發帖，計劃發送 ${times} 個帖子，間隔 ${intervalSeconds} 秒`)
    
    for (let i = 0; i < times; i++) {
        try {
            await postReply()
            console.log(`已發送第 ${i + 1}/${times} 個帖子`)
            
            if (i < times - 1) {  // 如果不是最后一次发帖，则等待
                console.log(`等待 ${intervalSeconds} 秒後發送下一個...`)
                await delay(intervalSeconds * 1000)
            }
        } catch (error) {
            console.error(`第 ${i + 1} 次發帖失敗:`, error)
        }
    }
    
    console.log('所有帖子發送完成')
}

// 获取抽奖页面的 formhash
function getLotteryFormhash() {
    return new Promise((resolve, reject) => {
        req.get('https://lineage45.com/plugin.php?id=yinxingfei_zzza:yinxingfei_zzza_hall', (error, response, body) => {
            if (error) {
                reject(error)
                return
            }

            try {
                const $ = cheerio.load(body)
                formhash = $('input[name="formhash"]').first().attr('value')
                console.log('獲取到的抽獎頁 formhash:', formhash)
                resolve(formhash)
            } catch (err) {
                reject(err)
            }
        })
    })
}

// 执行抽奖
function doLottery() {
    const formData = {
        formhash: formhash
    }

    return new Promise((resolve, reject) => {
        req.post({
            url: 'https://lineage45.com/plugin.php?id=yinxingfei_zzza:yinxingfei_zzza_post',
            formData: formData,
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }, (error, response, body) => {
            if (error) {
                reject(error)
                return
            }
            console.log('完成抽奖')
            resolve(body)
        })
    })
}

// 修改执行流程函数
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
        // 添加抽奖流程
        await getLotteryFormhash()
        await doLottery()
    } catch (error) {
        console.error('操作過程出錯:', error)
    }
}

// 开始执行 - 例如发送1个帖子，间隔35秒
doLogin(config.times, 35)