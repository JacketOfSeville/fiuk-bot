const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('ffmpeg-static');
const { token } = require('./config.json');  // Store token in a config.json file

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,  // For voice state changes
    GatewayIntentBits.MessageContent,    // For reading message content
    GatewayIntentBits.GuildMessages 
] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});


/**
 * Função para tocar o áudio com suporte a tentativas em caso de desconexão
 * @param {url} url Url do vídeo a ser tocado
 * @param {player} player Objeto do tocador de áudio
 * @param {connection} connection Conexão do bot com o canal
 * @param {retries} retries Tentativas de reconexão
 * @returns 
 */
async function playWithRetries(url, player, connection, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const stream = ytdl(url, {
                filter: 'audioonly',
                highWaterMark: 1 << 25,   // Increase buffer size
                requestOptions: {
                    headers: { 'User-Agent': 'Mozilla/5.0' },  // Mimic a real browser
                    timeout: 10000
                }
            });
            const resource = createAudioResource(stream);
            player.play(resource);
            connection.subscribe(player);
            return;  // Exit once successful
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, (2 ** i) * 1000));  // Exponential backoff
            } else {
                throw new Error('All retry attempts failed.');
            }
        }
    }
} 

client.on('messageCreate', async message => {
    if (message.content.startsWith('fiuk!')) {
        const args = message.content.slice(6).trim();
        if (!args) return message.reply('Coloca uma URL do Youtube, seu mongolóide!');
        
        // Entra no canal de voz
        if (message.member.voice.channel) {
            const connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
        
            connection.on(VoiceConnectionStatus.Ready, () => {
                console.log('The bot has connected to the channel!');
            });

            connection.on('stateChange', (oldState, newState) => {
                if (newState.status === 'disconnected') {
                    console.log('Voice connection lost, attempting to reconnect...');
                    connection.rejoin();
                }
            });
            
            // Cria o objeto do reprodutor
            const player = createAudioPlayer();
        
            // Toca o áudio com manuseio de erros
            try {
                playWithRetries(args, player, connection);
                
            } catch (error) {
                console.error('Failed to load the audio stream:', error);
                message.reply('Não deu pra tocar patrão, tenta denovo depois!');
            }
        } else {
          message.reply('Entra num canal de voz primeiro, seu retardado!');
        }
    }
});
 

client.login(token);
