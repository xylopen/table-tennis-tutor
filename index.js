#!/usr/bin/env node
const axios = require('axios');
const { loadProgress, saveProgress, getCurrentLesson, getLessonCard, getConfirmCard, getProgressCard, LESSONS } = require('./lib.js');

const appId = 'cli_a918b4b7de78dbc8';
const appSecret = 'v7EMLRiBMGI8DkuWd5W3aeL4Dzhvg7BA';

async function getTenantAccessToken() {
  const response = await axios.post(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    { app_id: appId, app_secret: appSecret }
  );
  return response.data.tenant_access_token;
}

async function sendCard(userId, card) {
  const token = await getTenantAccessToken();
  await axios.post(
    'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id',
    {
      receive_id: userId,
      msg_type: 'interactive',
      content: JSON.stringify(card)
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
      }
    }
  );
}

async function sendText(userId, text) {
  const token = await getTenantAccessToken();
  await axios.post(
    'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id',
    {
      receive_id: userId,
      msg_type: 'text',
      content: JSON.stringify({ text })
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
      }
    }
  );
}

// 命令行参数
const args = process.argv.slice(2);
const command = args[0];

const userId = args.includes('--user') ? args[args.indexOf('--user') + 1] : null;

async function main() {
  const progress = loadProgress();
  
  switch (command) {
    case 'start':
    case 'lesson': {
      const lesson = getCurrentLesson(progress);
      const card = getLessonCard(lesson);
      await sendCard(userId, card);
      console.log(`✅ 已发送 ${lesson.title}`);
      break;
    }
    
    case 'complete': {
      // 发送确认卡片
      const card = getConfirmCard(progress.currentLesson);
      await sendCard(userId, card);
      console.log('✅ 已发送确认卡片');
      break;
    }
    
    case 'confirm': {
      // 确认完成，进入下一课
      progress.totalCompleted++;
      if (progress.currentLesson < LESSONS.length) {
        progress.currentLesson++;
      } else {
        progress.currentLesson = 1; // 循环或结束
      }
      saveProgress(progress);
      
      await sendText(userId, '🎉 太棒了！练习完成！\n\n');
      
      const nextLesson = getCurrentLesson(progress);
      const card = getLessonCard(nextLesson);
      await sendCard(userId, card);
      console.log(`✅ 已进入下一课：${nextLesson.title}`);
      break;
    }
    
    case 'progress':
    case 'status': {
      const card = getProgressCard(progress);
      await sendCard(userId, card);
      console.log('✅ 已发送进度卡片');
      break;
    }
    
    case 'reset': {
      progress.currentLesson = 1;
      progress.totalCompleted = 0;
      saveProgress(progress);
      await sendText(userId, '✅ 课程已重置！从第1课开始～');
      console.log('✅ 进度已重置');
      break;
    }
    
    default:
      console.log(`
🎱 台球练习助手

用法：
  node table-tennis-tutor.js start --user ou_xxx     开始/继续练习
  node table-tennis-tutor.js complete --user ou_xxx  发送确认卡片
  node table-tennis-tutor.js confirm --user ou_xxx   确认完成，进入下一课
  node table-tennis-tutor.js progress --user ou_xxx   查看进度
  node table-tennis-tutor.js reset --user ou_xxx      重置课程
      `);
  }
}

main().catch(console.error);
