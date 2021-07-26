require('dotenv').config();
const express = require('express');
const app = express();

app.listen(process.env.PORT || 3000,() =>{})

const ytdl = require('ytdl-core');
const axios = require('axios');

const { Client, WebhookClient, MessageEmbed  } = require('discord.js');
const { Server } = require('http');

const client = new Client({
  partials: ['MESSAGE', 'REACTION']
});

const PREFIX = ".";
let servers = {};

client.on('ready', () => {
  console.log(`${client.user.tag} has logged in.`);
});

function play(msg, connection)
{
  servers[msg.guild.id].dispatcher = connection.play(ytdl(servers[msg.guild.id].queue[0], { filter: 'audioonly' }));
  msg.channel.send(`Now playing: **${servers[msg.guild.id].titles[0]}**`);
  servers[msg.guild.id].titles.shift();
  servers[msg.guild.id].dispatcher.on('finish', () => {
    servers[msg.guild.id].queue.shift();
    if(servers[msg.guild.id].queue[0])
      play(msg, connection);
    else
    {
      connection.disconnect();
      msg.channel.send('There is nothing left for me to play!');
    }
      
  })
}

client.on('message', async (msg) => {
  let title = '';
  if (msg.author.bot) return;
  if (msg.content.startsWith(PREFIX)) {
    const [command, ...args] = msg.content
      .trim()
      .substring(PREFIX.length)
      .split(/\s+/);
    if(command === 'play')
    {
      if(!args[0].includes('http'))
      {
        args[0] = args.join(' ');
        const result = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${args[0]}&topicId=/m/04rlf&type=video&key=${process.env.YT_TOKEN}`);
        args[0] = `https://www.youtube.com/watch?v=${result.data.items[0].id.videoId}`;
        title = result.data.items[0].snippet.title;
      }
      else title = args[0];
      if(!msg.member.voice.channel)
      {
        msg.reply('You need to join a voice channel first!');
        return;
      }

      if(!servers[msg.guild.id])
        servers[msg.guild.id] = {queue: [], titles: []};
      servers[msg.guild.id].queue.push(args[0]);
      servers[msg.guild.id].titles.push(title);
      if(servers[msg.guild.id].queue.length === 1)
        msg.member.voice.channel.join().then( connection => {
          msg.react('🆗');
          play(msg,connection);
        })
      else 
      {
        msg.react('🆗');
        msg.channel.send(`Added to queue: **${title}**`);
      }
    }
    if(command === 'queue')
    {
      const queueMsg = new MessageEmbed()
        .setTitle('Queue')
        .setColor(0xff69b4)
      if(!servers[msg.guild.id].titles[0])
         msg.channel.send('There are no tracks in the queue.');
      else
        {
          let tracks = '';
          for(let i = 0; i < servers[msg.guild.id].titles.length; i++)
            tracks+=`**${i+1}.** ${servers[msg.guild.id].titles[i]} \n`;
          queueMsg.setDescription(tracks);
          msg.channel.send(queueMsg);
        }
    }
    if(command === 'skip')
    {
      if(!msg.member.voice.channel)
      {
        msg.reply('You need to join a voice channel first!');
        return;
      }
      msg.react('🆗');
      if(servers[msg.guild.id].dispatcher)
        servers[msg.guild.id].dispatcher.end();
    }
    if(command === 'stop')
    {
      if(!msg.member.voice.channel)
      {
        msg.reply('You need to join a voice channel first!');
        return;
      }
      msg.react('🆗');
      const len = servers[msg.guild.id].queue.length;
      if(servers[msg.guild.id].queue.length)
        for(let i = 0; i < len; i++)
        {
          servers[msg.guild.id].queue.shift();
          servers[msg.guild.id].titles.shift();
        }
      servers[msg.guild.id].dispatcher.end();
    }
  }
});

client.login(process.env.BOT_TOKEN);
