import { APIApplicationCommandOption, ChatInputCommandInteraction } from 'discord.js';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import Snipe from '../../db/index';

export default {
  name: 'snipe',
  description: 'Retrieves recently deleted or edited messages.',
  options: [{
    name: 'channel',
    description: 'The channel to snipe messages from',
    type: ApplicationCommandOptionType.Channel,
    required: false,
  }, {
    name: 'type',
    description: 'Whether to fetch the last deleted or last edited message',
    type: ApplicationCommandOptionType.String,
    required: true,
    choices: [
      {
        name: 'deleted',
        value: 'delete',
      },
      {
        name: 'edited',
        value: 'edit',
      },
    ],
  }, {
    name: 'amount',
    description: 'The amount of messages to retrieve',
    type: ApplicationCommandOptionType.Integer,
    required: false,
  }],
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });

    const channelOption = interaction.options.getChannel('channel') || interaction.channel;
    const messageType = interaction.options.getString('type', true);
    const amount = interaction.options.getInteger('amount') || 1;

    if (!channelOption || !('messages' in channelOption)) {
      await interaction.editReply('The specified channel is not a text-based channel.');
      return;
    }

    const snipedMessages = await SnipedMessage.find({
      channelId: channelOption.id,
      methodType: messageType,
    }).sort({ timestamp: -1 }).limit(amount);

    if (!snipedMessages.length) {
      await interaction.editReply(`No recently ${messageType === 'delete' ? 'deleted' : 'edited'} messages found.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Sniped Messages in #${channelOption.name}`)
      .setColor('#0099ff');

    snipedMessages.forEach((msg, index) => {
      if (index < 25) {
        const hasMediaText = msg.hasMedia ? ' [Media]' : '';
        embed.addFields({ name: `Message ${index + 1}${hasMediaText}`, value: msg.content.substring(0, 1024) });
      }
    });

    await interaction.editReply({ embeds: [embed] });
  },
} as Command;
